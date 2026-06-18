// web/client/src/app/src/components/CsvImport.jsx
// Phase 6 (slim) — import companies from a spreadsheet. Three steps: choose a
// file (or paste), map columns to fields, import. Duplicates (by name/email)
// are skipped server-side. Parses CSV in the browser; sends mapped rows to
// POST /api/contacts/import. Props: onBack(), onDone().
import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Upload, FileSpreadsheet, CircleCheck } from 'lucide-react';

// Target fields we can import into. `name` is required.
const FIELDS = [
  { key: 'name',           label: 'Company name', required: true, hints: ['name', 'company', 'business', 'account'] },
  { key: 'email',          label: 'Email',        hints: ['email', 'e-mail', 'mail'] },
  { key: 'phone',          label: 'Phone',        hints: ['phone', 'tel', 'mobile', 'number'] },
  { key: 'primaryContact', label: 'Contact person', hints: ['contact', 'person', 'owner'] },
  { key: 'website',        label: 'Website',      hints: ['web', 'url', 'site'] },
  { key: 'salesStage',     label: 'Sales stage',  hints: ['stage', 'status'] },
  { key: 'notes',          label: 'Notes',        hints: ['note', 'comment', 'detail'] },
];

// Minimal RFC-4180-ish CSV parser (handles quotes, embedded commas, CRLF).
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

const guess = (header, field) => {
  const h = (header || '').toLowerCase();
  return field.hints.some((x) => h.includes(x));
};

export default function CsvImport({ onBack, onDone }) {
  const [step, setStep] = useState(1);
  const [raw, setRaw] = useState('');
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [mapping, setMapping] = useState({}); // fieldKey -> header index (string) or ''
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const ingest = (text) => {
    const parsed = parseCSV(text);
    if (parsed.length < 2) { setError('That file needs a header row and at least one data row.'); return; }
    const hdrs = parsed[0].map((h) => h.trim());
    const rows = parsed.slice(1);
    const auto = {};
    FIELDS.forEach((f) => { const idx = hdrs.findIndex((h) => guess(h, f)); if (idx >= 0) auto[f.key] = String(idx); });
    setHeaders(hdrs); setDataRows(rows); setMapping(auto); setError(null); setStep(2);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => ingest(String(reader.result || ''));
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(file);
  };

  const mapped = useMemo(() => {
    const ni = mapping.name;
    if (ni === undefined || ni === '') return [];
    return dataRows.map((r) => {
      const obj = {};
      FIELDS.forEach((f) => { const idx = mapping[f.key]; if (idx !== undefined && idx !== '') obj[f.key] = (r[Number(idx)] || '').trim(); });
      return obj;
    }).filter((o) => o.name);
  }, [dataRows, mapping]);

  const doImport = async () => {
    setImporting(true); setError(null);
    try {
      const r = await fetch('/api/contacts/import', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'company', rows: mapped }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setResult(data); setStep(3); onDone && onDone();
    } catch (e) { setError(e.message || 'Import failed.'); } finally { setImporting(false); }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button onClick={() => onBack && onBack()} className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800 mb-3">
        <ArrowLeft className="w-4 h-4" /> Back to companies
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-4 md:px-5">
        <div className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-1"><FileSpreadsheet className="w-4 h-4 text-[#0C447C]" /> Import companies</div>
        <div className="text-[13px] text-gray-500 mb-4">Step {step} of 3 · {step === 1 ? 'choose a file' : step === 2 ? 'match the columns' : 'done'}</div>

        {/* Step 1 — upload */}
        {step === 1 && (
          <div>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-10 cursor-pointer hover:bg-gray-50">
              <Upload className="w-6 h-6 text-gray-400" />
              <span className="text-[13px] text-gray-600">Choose a CSV file</span>
              <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            </label>
            <div className="text-[12px] text-gray-400 mt-3">Or paste rows (first line = column headers):</div>
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={4} placeholder="Company name,Email,Phone&#10;Acme Ltd,hi@acme.co,01234..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[12.5px] font-mono mt-1" />
            <div className="flex justify-end mt-2">
              <button onClick={() => ingest(raw)} disabled={!raw.trim()} className="inline-flex items-center gap-1.5 rounded-lg border border-[#0C447C] text-[#0C447C] px-3 py-1.5 text-[13px] disabled:opacity-40">
                Use pasted text <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — map columns */}
        {step === 2 && (
          <div>
            <div className="text-[13px] text-gray-600 mb-3">{dataRows.length} {dataRows.length === 1 ? 'row' : 'rows'} found. Match your columns to the fields:</div>
            <div className="grid gap-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-2">
                  <div className="text-[13px] text-gray-700">{f.label}{f.required && <span className="text-red-600"> *</span>}</div>
                  <select value={mapping[f.key] ?? ''} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-[13px] bg-white">
                    <option value="">— skip —</option>
                    {headers.map((h, idx) => <option key={idx} value={String(idx)}>{h || `Column ${idx + 1}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="text-[12px] text-gray-500 mt-3">{mapped.length} {mapped.length === 1 ? 'company' : 'companies'} ready to import. Duplicates (same name or email) are skipped automatically.</div>
            {error && <div className="text-[12px] text-red-700 mt-2">{error}</div>}
            <div className="flex justify-between mt-4">
              <button onClick={() => setStep(1)} className="text-[13px] text-gray-500 hover:text-gray-800">Back</button>
              <button onClick={doImport} disabled={importing || mapped.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-[#0C447C] text-[#0C447C] px-3 py-1.5 text-[13px] hover:bg-[#E6F1FB] disabled:opacity-40">
                {importing ? 'Importing…' : `Import ${mapped.length}`} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — result */}
        {step === 3 && result && (
          <div className="text-center py-6">
            <CircleCheck className="w-10 h-10 text-[#0F6E56] mx-auto mb-2" />
            <div className="text-[15px] font-medium text-gray-900">Import complete</div>
            <div className="text-[13px] text-gray-600 mt-1">
              {result.created} added · {result.skipped} skipped (duplicates){result.errors?.length ? ` · ${result.errors.length} couldn’t be saved` : ''}
            </div>
            <button onClick={() => onBack && onBack()} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#0C447C] text-[#0C447C] px-3 py-1.5 text-[13px] hover:bg-[#E6F1FB]">
              Done
            </button>
          </div>
        )}

        {step === 1 && error && <div className="text-[12px] text-red-700 mt-2">{error}</div>}
      </div>
    </div>
  );
}
