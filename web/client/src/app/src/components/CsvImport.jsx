// web/client/src/app/src/components/CsvImport.jsx
// Import companies from a spreadsheet. Three steps: choose a file (or paste),
// match the columns, import. Built to cope with big real-world exports
// (tens of thousands of rows, dozens of columns):
//   • smarter column matching (an exact "company" beats "firstname", and a
//     nearly-empty column loses to a well-filled one of the same kind);
//   • rows are sent to the server in batches, so there is no row limit and
//     no long single request that could time out — with live progress;
//   • two columns can be joined into one field (First name + Last name);
//   • a field can be given one fixed value for every row (e.g. Sales stage);
//   • non-company rows ("Self-employed", "Freelance", blanks) can be skipped;
//   • repeated company names within the file are merged before sending;
//   • a preview of the first rows, so the mapping can be checked before import;
//   • the mapping is remembered for the next spreadsheet.
// Duplicates against companies already in the system are skipped server-side.
// Sends to POST /api/contacts/import. Props: onBack(), onDone().
import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Upload, FileSpreadsheet, CircleCheck, Plus, X } from 'lucide-react';

// Sentinel used in the column dropdown to mean "type one value for every row".
const FIXED = '__fixed__';

// How many rows go to the server per request. Small enough that each request
// stays quick and cannot time out; large enough that big files still fly.
const BATCH_SIZE = 500;

// Remembered mapping (stored by column NAME so it survives column reordering).
const MAP_KEY = 'wt_csv_import_map';

// The sales stages the server will accept.
const STAGE_OPTIONS = [
  { value: 'new', label: 'Suspect' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'hot_prospect', label: 'Hot prospect' },
  { value: 'customer', label: 'Customer' },
];

// Target fields we can import into. `name` is required.
//   exact — full/word matches on the column heading (strong signal)
//   weak  — loose "contains" fallback (never auto-selected on its own)
//   avoid — headings that look right but mean something else
const FIELDS = [
  {
    key: 'name', label: 'Company name', required: true,
    exact: ['company', 'company name', 'business', 'business name', 'account', 'account name', 'organisation', 'organization', 'org', 'employer', 'firm', 'trading name'],
    weak: ['company', 'business', 'account'],
    avoid: ['first', 'last', 'fore', 'sur', 'contact', 'person', 'user', 'full', 'display', 'domain', 'website', 'url', 'logo', 'id', 'linkedin', 'industry', 'location', 'type', 'size', 'employee', 'description', 'special', 'founded', 'year', 'month', 'count', 'range'],
  },
  {
    key: 'email', label: 'Email',
    exact: ['email', 'e mail', 'mail', 'email address', 'work email', 'business email'],
    weak: ['email', 'mail'],
    avoid: ['linkedin', 'domain', 'validity', 'status'],
  },
  {
    key: 'phone', label: 'Phone',
    exact: ['phone', 'telephone', 'tel', 'mobile', 'phone number', 'contact number', 'direct dial'],
    weak: ['phone', 'tel', 'mobile'],
    avoid: ['fax'],
  },
  {
    key: 'primaryContact', label: 'Contact person',
    exact: ['contact', 'contact person', 'contact name', 'primary contact', 'owner', 'full name', 'name'],
    weak: ['contact', 'person', 'owner'],
    avoid: ['company', 'business', 'account', 'email', 'phone', 'number', 'id', 'url'],
  },
  {
    key: 'website', label: 'Website',
    exact: ['website', 'web site', 'url', 'site', 'web', 'domain', 'company website', 'homepage'],
    weak: ['web', 'url', 'site', 'domain'],
    avoid: ['linkedin', 'navigator', 'profile', 'picture', 'logo', 'email'],
  },
  {
    key: 'address', label: 'Address',
    exact: ['address', 'company address', 'company location', 'registered address', 'town', 'city', 'postcode', 'post code', 'zip'],
    weak: ['address', 'location'],
    avoid: ['email', 'ip', 'url', 'web'],
  },
  {
    key: 'industry', label: 'Industry',
    exact: ['industry', 'company industry', 'sector', 'trade', 'vertical'],
    weak: ['industry', 'sector'],
    avoid: [],
  },
  {
    key: 'employees', label: 'Number of employees',
    exact: ['number of employees', 'employees', 'employee count', 'company employee count', 'headcount', 'staff', 'company size', 'size'],
    weak: ['employee', 'headcount', 'staff'],
    avoid: ['range', 'description'],
  },
  {
    key: 'salesStage', label: 'Sales stage',
    exact: ['sales stage', 'stage', 'status', 'lead status', 'pipeline stage'],
    weak: ['stage'],
    avoid: ['open', 'premium', 'public', 'email'],
  },
  {
    key: 'notes', label: 'Notes',
    exact: ['notes', 'note', 'comments', 'comment'],
    weak: ['description', 'summary', 'detail', 'headline'],
    avoid: [],
  },
];

// Values that are clearly not a real company.
const JUNK_NAMES = new Set([
  'self', 'selfemployed', 'self employed', 'freelance', 'freelancer', 'freelancing',
  'na', 'n a', 'none', 'null', 'nil', 'nothing', 'retired', 'unemployed', 'student',
  'private', 'confidential', 'unknown', 'undisclosed', 'tbc', 'tba', 'test', 'various',
  'independent', 'independent consultant', 'sole trader', 'home', 'personal',
]);

const junkKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const isJunkName = (s) => {
  const k = junkKey(s);
  return !k || k.length < 2 || JUNK_NAMES.has(k);
};

// Minimal RFC-4180-ish CSV parser (handles quotes, embedded commas, CRLF).
// Unchanged, proven logic — it already reads these exports correctly.
function parseCSV(text) {
  const rows = []; let cur = []; let field = ''; let i = 0; let inQ = false;
  const pushF = () => { cur.push(field); field = ''; };
  const pushR = () => { rows.push(cur); cur = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { pushF(); i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { pushF(); pushR(); i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || cur.length > 0) { pushF(); pushR(); }
  return rows.filter((r) => r.length && !(r.length === 1 && r[0].trim() === ''));
}

// Normalise a column heading for matching: "company_website" -> "company website".
const norm = (h) => String(h || '').toLowerCase()
  .replace(/[_\-.]+/g, ' ')
  .replace(/[^a-z0-9 ]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// How well does this column heading match this field? 0 = no match.
function scoreHeader(header, field) {
  const h = norm(header);
  if (!h) return 0;
  const words = h.split(' ');
  let s = 0;
  field.exact.forEach((t) => {
    if (h === t) s = Math.max(s, 100);
    else if (h.startsWith(`${t} `)) s = Math.max(s, 80);
    else if (h.endsWith(` ${t}`)) s = Math.max(s, 70);
    else if (words.includes(t)) s = Math.max(s, 60);
  });
  if (s === 0 && field.weak.some((t) => h.includes(t))) s = 20;
  if (s > 0 && field.avoid.some((t) => h.includes(t))) s -= 60;
  return s;
}

// What proportion of sampled rows have a value in each column?
function fillRates(rows, colCount) {
  const sample = rows.slice(0, 2000);
  const counts = new Array(colCount).fill(0);
  sample.forEach((r) => {
    for (let i = 0; i < colCount; i++) if ((r[i] || '').trim() !== '') counts[i]++;
  });
  const n = sample.length || 1;
  return counts.map((c) => c / n);
}

// Choose the best column for a field. Only a solid structural match counts, and
// where two columns match about equally well the better-filled one wins — that
// is what stops a nearly-empty "email" beating a well-filled "email_enrich".
function autoPick(headers, field, fills) {
  const cands = headers
    .map((h, i) => ({ i, s: scoreHeader(h, field), fill: fills[i] || 0 }))
    .filter((c) => c.s >= 50)
    .sort((a, b) => b.s - a.s);
  if (!cands.length) return '';
  const best = cands[0].s;
  const near = cands.filter((c) => best - c.s <= 25).sort((a, b) => b.fill - a.fill);
  return String(near[0].i);
}

// Find a first-name / last-name pair so "Contact person" can be filled from both.
const findNamePair = (headers) => {
  const first = headers.findIndex((h) => /^(first ?name|forename|given ?name)$/.test(norm(h)));
  const last = headers.findIndex((h) => /^(last ?name|surname|family ?name)$/.test(norm(h)));
  return first >= 0 && last >= 0 ? [String(first), String(last)] : null;
};

// Spreadsheets exported from Excel often lose the leading zero on UK phone
// numbers (Excel treats them as numbers), so "01892 807001" arrives as
// "1892807001". This restores it — but ONLY where it is unambiguous: a bare
// 10-digit number starting 1/2/3/7/8/9 (UK landline/mobile ranges). Anything
// already starting 0, +, or 00, anything with a different digit count, and
// anything non-numeric is left exactly as it was.
const fixUkPhone = (raw) => {
  const v = String(raw || '').trim();
  if (!v) return v;
  if (/^(\+|00|0)/.test(v)) return v;              // already fine / international
  const digits = v.replace(/\D/g, '');
  if (digits.length !== 10) return v;              // not a zero-stripped UK number
  if (!/^[123789]/.test(digits[0])) return v;      // not a UK landline/mobile prefix
  return `0${v}`;
};

const blankMap = () => {
  const m = {};
  FIELDS.forEach((f) => { m[f.key] = { col: '', col2: '', fixed: '' }; });
  return m;
};

const readSavedMapping = (headers) => {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(MAP_KEY) || 'null'); } catch { saved = null; }
  if (!saved) return null;
  const m = blankMap();
  let hits = 0;
  FIELDS.forEach((f) => {
    const v = saved[f.key];
    if (!v) return;
    if (v.fixed !== undefined && v.fixed !== '') { m[f.key] = { col: FIXED, col2: '', fixed: v.fixed }; hits++; return; }
    const i = headers.indexOf(v.col);
    if (i < 0) return;
    const i2 = v.col2 ? headers.indexOf(v.col2) : -1;
    m[f.key] = { col: String(i), col2: i2 >= 0 ? String(i2) : '', fixed: '' };
    hits++;
  });
  // Only reuse it if the required field actually landed.
  return hits > 0 && m.name.col ? m : null;
};

const writeSavedMapping = (mapping, headers) => {
  try {
    const out = {};
    FIELDS.forEach((f) => {
      const v = mapping[f.key];
      if (!v || !v.col) return;
      if (v.col === FIXED) { out[f.key] = { fixed: v.fixed }; return; }
      out[f.key] = { col: headers[Number(v.col)] || '', col2: v.col2 ? (headers[Number(v.col2)] || '') : '' };
    });
    localStorage.setItem(MAP_KEY, JSON.stringify(out));
  } catch { /* storage unavailable — not important enough to interrupt the import */ }
};

const nf = (n) => Number(n || 0).toLocaleString();

export default function CsvImport({ onBack, onDone }) {
  const [step, setStep] = useState(1);
  const [raw, setRaw] = useState('');
  const [reading, setReading] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [mapping, setMapping] = useState(blankMap);
  const [reusedMapping, setReusedMapping] = useState(false);
  const [skipJunk, setSkipJunk] = useState(true);
  const [fixPhones, setFixPhones] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const buildAutoMapping = (hdrs, rows) => {
    const fills = fillRates(rows, hdrs.length);
    const m = blankMap();
    FIELDS.forEach((f) => { m[f.key] = { col: autoPick(hdrs, f, fills), col2: '', fixed: '' }; });
    // No single "contact" column, but separate first/last names? Join them.
    if (!m.primaryContact.col) {
      const pair = findNamePair(hdrs);
      if (pair) m.primaryContact = { col: pair[0], col2: pair[1], fixed: '' };
    }
    // Safety net: a bare "Name" column matches Contact person, but if the file
    // has no company-ish column at all then "Name" almost certainly IS the
    // company name — and that field is required, so it wins.
    if (!m.name.col && m.primaryContact.col && m.primaryContact.col2 === '') {
      m.name = { col: m.primaryContact.col, col2: '', fixed: '' };
      m.primaryContact = { col: '', col2: '', fixed: '' };
    }
    return m;
  };

  const ingest = (text) => {
    const parsed = parseCSV(text);
    if (parsed.length < 2) { setError('That file needs a header row and at least one data row.'); return; }
    const hdrs = parsed[0].map((h) => h.trim());
    const rows = parsed.slice(1);
    const saved = readSavedMapping(hdrs);
    setHeaders(hdrs);
    setDataRows(rows);
    setMapping(saved || buildAutoMapping(hdrs, rows));
    setReusedMapping(Boolean(saved));
    setError(null);
    setStep(2);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReading(true); setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      // Let the "Reading…" message paint before the (blocking) parse starts.
      setTimeout(() => {
        try { ingest(text); } catch { setError('Could not read that file.'); } finally { setReading(false); }
      }, 30);
    };
    reader.onerror = () => { setError('Could not read that file.'); setReading(false); };
    reader.readAsText(file);
  };

  const setField = (key, patch) => setMapping((m) => ({ ...m, [key]: { ...m[key], ...patch } }));

  const resetMapping = () => {
    setMapping(buildAutoMapping(headers, dataRows));
    setReusedMapping(false);
  };

  // Build the rows we will actually send, and count what got left out.
  const prepared = useMemo(() => {
    const empty = { rows: [], junk: 0, dupes: 0, blank: 0, phonesFixed: 0 };
    if (!mapping.name || !mapping.name.col) return empty;
    const out = [];
    let junk = 0; let dupes = 0; let blank = 0; let phonesFixed = 0;
    const seen = new Set();
    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const obj = {};
      for (const f of FIELDS) {
        const m = mapping[f.key];
        if (!m || !m.col) continue;
        if (m.col === FIXED) { if (m.fixed) obj[f.key] = m.fixed; continue; }
        let v = (r[Number(m.col)] || '').trim();
        if (m.col2 !== '') {
          const v2 = (r[Number(m.col2)] || '').trim();
          v = [v, v2].filter(Boolean).join(' ');
        }
        if (f.key === 'phone' && fixPhones && v) {
          const fixed = fixUkPhone(v);
          if (fixed !== v) { v = fixed; phonesFixed++; }
        }
        if (v) obj[f.key] = v;
      }
      const nm = obj.name;
      if (!nm) { blank++; continue; }
      if (skipJunk && isJunkName(nm)) { junk++; continue; }
      const key = nm.toLowerCase();
      if (seen.has(key)) { dupes++; continue; }
      seen.add(key);
      out.push(obj);
    }
    return { rows: out, junk, dupes, blank, phonesFixed };
  }, [dataRows, mapping, skipJunk, fixPhones]);

  const previewRows = useMemo(() => prepared.rows.slice(0, 5), [prepared.rows]);
  const previewCols = useMemo(
    () => FIELDS.filter((f) => mapping[f.key] && mapping[f.key].col),
    [mapping],
  );

  const doImport = async () => {
    const rows = prepared.rows;
    if (!rows.length) return;
    setImporting(true); setError(null); setResult(null);
    setProgress({ done: 0, total: rows.length });
    let created = 0; let skipped = 0; let failed = 0;
    try {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const slice = rows.slice(i, i + BATCH_SIZE);
        const r = await fetch('/api/contacts/import', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'company', rows: slice }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        created += data.created || 0;
        skipped += data.skipped || 0;
        failed += (data.errors || []).length;
        setProgress({ done: Math.min(i + BATCH_SIZE, rows.length), total: rows.length });
      }
      writeSavedMapping(mapping, headers);
      setResult({ created, skipped, failed, total: rows.length });
      setStep(3);
      onDone && onDone();
    } catch (e) {
      setError(
        `${e.message || 'Import failed.'} ${nf(created)} companies were added before it stopped. `
        + 'You can safely run the import again — anything already added will be skipped as a duplicate.',
      );
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const selectCls = 'border border-[#2e2e4a] rounded-lg px-3 py-2 text-[13px] bg-[#242438] text-white w-full';

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <button onClick={() => onBack && onBack()} className="inline-flex items-center gap-1.5 text-[13px] text-[#94a3b8] hover:text-white mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to companies
      </button>

      <div className="bg-[#242438] border border-[#2e2e4a] rounded-xl p-4 md:px-5">
        <div className="text-lg font-medium text-white flex items-center gap-2 mb-1"><FileSpreadsheet className="w-4 h-4 text-[#0C447C]" /> Import companies</div>
        <div className="text-[13px] text-[#94a3b8] mb-4">Step {step} of 3 · {step === 1 ? 'choose a file' : step === 2 ? 'match the columns' : 'done'}</div>

        {/* Step 1 — upload */}
        {step === 1 && (
          <div>
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#2e2e4a] rounded-xl py-10 ${reading ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:bg-[#1f1f33]'}`}>
              <Upload className="w-6 h-6 text-[#6b7280]" />
              <span className="text-[13px] text-[#94a3b8]">{reading ? 'Reading your file… large files can take a few seconds' : 'Choose a CSV file'}</span>
              <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={reading} className="hidden" />
            </label>
            <div className="text-[12px] text-[#6b7280] mt-3">Or paste rows (first line = column headers):</div>
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={4} placeholder="Company name,Email,Phone&#10;Acme Ltd,hi@acme.co,01234..." className="w-full border border-[#2e2e4a] rounded-lg px-3 py-2 text-[12.5px] font-mono mt-1 bg-[#1f1f33] text-white" />
            <div className="flex justify-end mt-2">
              <button onClick={() => ingest(raw)} disabled={!raw.trim() || reading} className="inline-flex items-center gap-1.5 rounded-lg border border-[#0C447C] text-[#0C447C] px-3 py-1.5 text-[13px] disabled:opacity-40">
                Use pasted text <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — map columns */}
        {step === 2 && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="text-[13px] text-[#94a3b8]">
                {nf(dataRows.length)} {dataRows.length === 1 ? 'row' : 'rows'} found. Match your columns to the fields:
              </div>
              {reusedMapping && (
                <div className="text-[12px] text-[#94a3b8]">
                  Reused your last import’s matching ·{' '}
                  <button onClick={resetMapping} className="text-[#0C447C] hover:underline">start fresh</button>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              {FIELDS.map((f) => {
                const m = mapping[f.key] || { col: '', col2: '', fixed: '' };
                const isFixed = m.col === FIXED;
                const isColumn = m.col !== '' && !isFixed;
                return (
                  <div key={f.key} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-start gap-2">
                    <div className="text-[13px] text-[#cbd5e1] md:pt-2">
                      {f.label}{f.required && <span className="text-red-600"> *</span>}
                    </div>
                    <div className="grid gap-1.5">
                      <select
                        value={m.col}
                        onChange={(e) => setField(f.key, { col: e.target.value, col2: '', fixed: '' })}
                        className={selectCls}
                      >
                        <option value="">— skip —</option>
                        <option value={FIXED}>— same value for every row —</option>
                        {headers.map((h, idx) => <option key={idx} value={String(idx)}>{h || `Column ${idx + 1}`}</option>)}
                      </select>

                      {/* One typed value used for every row */}
                      {isFixed && (
                        f.key === 'salesStage' ? (
                          <select value={m.fixed} onChange={(e) => setField(f.key, { fixed: e.target.value })} className={selectCls}>
                            <option value="">— choose a stage —</option>
                            {STAGE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        ) : (
                          <input
                            value={m.fixed}
                            onChange={(e) => setField(f.key, { fixed: e.target.value })}
                            placeholder={`Value for every row`}
                            className={selectCls}
                          />
                        )
                      )}

                      {/* Optionally join a second column onto this field */}
                      {isColumn && m.col2 === '' && (
                        <button
                          onClick={() => setField(f.key, { col2: m.col })}
                          className="inline-flex items-center gap-1 text-[12px] text-[#94a3b8] hover:text-white w-fit"
                        >
                          <Plus className="w-3.5 h-3.5" /> add a second column
                        </button>
                      )}
                      {isColumn && m.col2 !== '' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] text-[#6b7280]">+</span>
                          <select value={m.col2} onChange={(e) => setField(f.key, { col2: e.target.value })} className={selectCls}>
                            {headers.map((h, idx) => <option key={idx} value={String(idx)}>{h || `Column ${idx + 1}`}</option>)}
                          </select>
                          <button onClick={() => setField(f.key, { col2: '' })} title="Remove second column" className="text-[#94a3b8] hover:text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="flex items-center gap-2 mt-3 text-[12.5px] text-[#cbd5e1] cursor-pointer">
              <input type="checkbox" checked={skipJunk} onChange={(e) => setSkipJunk(e.target.checked)} />
              Skip rows that aren’t real companies (“Self-employed”, “Freelance”, “Retired”, blanks)
            </label>
            <label className="flex items-center gap-2 mt-1.5 text-[12.5px] text-[#cbd5e1] cursor-pointer">
              <input type="checkbox" checked={fixPhones} onChange={(e) => setFixPhones(e.target.checked)} />
              Put back the leading 0 on UK phone numbers that lost it in Excel
              {prepared.phonesFixed > 0 && <span className="text-[#94a3b8]">({nf(prepared.phonesFixed)} in this file)</span>}
            </label>

            {/* What will actually happen */}
            <div className="text-[12px] text-[#94a3b8] mt-3 leading-relaxed">
              <span className="text-white">{nf(prepared.rows.length)}</span> {prepared.rows.length === 1 ? 'company' : 'companies'} ready to import
              {prepared.dupes > 0 && <> · {nf(prepared.dupes)} repeated {prepared.dupes === 1 ? 'row' : 'rows'} merged</>}
              {prepared.junk > 0 && <> · {nf(prepared.junk)} skipped as not a real company</>}
              {prepared.blank > 0 && <> · {nf(prepared.blank)} skipped with no company name</>}
              .{' '}Companies already in WorkTrackr (same name or email) are skipped automatically.
            </div>

            {/* Preview so the matching can be checked before committing */}
            {previewRows.length > 0 && (
              <div className="mt-3 border border-[#2e2e4a] rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-[12px] text-[#94a3b8] border-b border-[#2e2e4a]">Preview — the first {previewRows.length} of these will import like this:</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-left text-[#6b7280]">
                        {previewCols.map((f) => <th key={f.key} className="px-3 py-1.5 font-normal whitespace-nowrap">{f.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-[#2e2e4a] text-[#cbd5e1]">
                          {previewCols.map((f) => (
                            <td key={f.key} className="px-3 py-1.5 max-w-[220px] truncate" title={row[f.key] || ''}>
                              {f.key === 'salesStage'
                                ? (STAGE_OPTIONS.find((s) => s.value === row[f.key])?.label || row[f.key] || '—')
                                : (row[f.key] || <span className="text-[#6b7280]">—</span>)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!mapping.name.col && (
              <div className="text-[12px] text-amber-500 mt-2">Choose which column holds the company name to continue.</div>
            )}
            {error && <div className="text-[12px] text-red-500 mt-2">{error}</div>}

            {/* Live progress while batches go up */}
            {importing && progress && (
              <div className="mt-3">
                <div className="h-1.5 bg-[#1f1f33] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0C447C] transition-all" style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }} />
                </div>
                <div className="text-[12px] text-[#94a3b8] mt-1">
                  Importing… {nf(progress.done)} of {nf(progress.total)} — please keep this page open.
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-4">
              <button onClick={() => setStep(1)} disabled={importing} className="text-[13px] text-[#94a3b8] hover:text-white disabled:opacity-40">Back</button>
              <button
                onClick={doImport}
                disabled={importing || prepared.rows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0C447C] text-[#0C447C] px-3 py-1.5 text-[13px] hover:bg-[#E6F1FB] disabled:opacity-40"
              >
                {importing ? 'Importing…' : `Import ${nf(prepared.rows.length)}`} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — result */}
        {step === 3 && result && (
          <div className="text-center py-6">
            <CircleCheck className="w-10 h-10 text-[#0F6E56] mx-auto mb-2" />
            <div className="text-[15px] font-medium text-white">Import complete</div>
            <div className="text-[13px] text-[#94a3b8] mt-1">
              {nf(result.created)} added · {nf(result.skipped)} skipped (already in WorkTrackr)
              {result.failed ? ` · ${nf(result.failed)} couldn’t be saved` : ''}
            </div>
            <div className="text-[12px] text-[#6b7280] mt-2">Your column matching has been saved for the next spreadsheet.</div>
            <button onClick={() => onBack && onBack()} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#0C447C] text-[#0C447C] px-3 py-1.5 text-[13px] hover:bg-[#E6F1FB]">
              Done
            </button>
          </div>
        )}

        {step === 1 && error && <div className="text-[12px] text-red-500 mt-2">{error}</div>}
      </div>
    </div>
  );
}
