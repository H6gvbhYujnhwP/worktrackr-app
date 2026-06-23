// web/client/src/app/src/components/SalesPageLayout.jsx
// Phase 8 (UX consolidation) — the single chrome shared by every Sales tab page
// (Companies / Leads / Quotes / Orders / Contracts). Extracted from the Leads tab
// look so the five pages can't drift apart again: same page wrapper + width, same
// header (title + count subtitle + right-aligned actions, optional search), same
// rounded-full filter-pill row, same bordered/rounded table shell.
//
// A page builds its header actions from <SalesSearch>, <SalesPrimaryButton> and
// <SalesSecondaryButton>; its filter row from <SalesAllPill> + <SalesFilterPill>;
// and passes its own table (grid header + rows) as children. The visual styling
// lives ONLY here — pages supply data and semantic pill colours.
//
// Accent (matches the Leads tab + the Sales tab underline):
//   primary green  #1D9E75 (hover #16835f)
//   active toggle  text/border #0F6E56 on bg #E1F5EE
//   active pill ring  #EF9F27 (amber)
import React from 'react';
import { Search, Plus } from 'lucide-react';

// ── header building blocks ───────────────────────────────────────────────────

// Bordered search box. value/onChange are required; placeholder optional.
export function SalesSearch({ value, onChange, placeholder = 'Search…', width = 'w-48' }) {
  return (
    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 h-9 bg-white">
      <Search className="w-4 h-4 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`text-[13px] outline-none ${width} bg-transparent`}
      />
    </div>
  );
}

// Green filled primary action (e.g. "Add company", "New order", "New contract").
export function SalesPrimaryButton({ icon: Icon = Plus, children, onClick, ...rest }) {
  return (
    <button
      onClick={onClick}
      className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-[#1D9E75] text-white px-3.5 text-[13px] hover:bg-[#16835f]"
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4" />} {children}
    </button>
  );
}

// Grey-outline secondary action (e.g. "Import"). When `active` is true it takes the
// green toggle treatment used by the Leads "Mine only" button.
export function SalesSecondaryButton({ icon: Icon, children, onClick, active = false, ...rest }) {
  return (
    <button
      onClick={onClick}
      className={`h-9 inline-flex items-center gap-1.5 rounded-lg border px-3 text-[13px] ${
        active
          ? 'border-[#0F6E56] bg-[#E1F5EE] text-[#0F6E56]'
          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4" />} {children}
    </button>
  );
}

// ── filter pills ─────────────────────────────────────────────────────────────

// The "All" pill: green when selected, neutral otherwise.
export function SalesAllPill({ active, count, onClick, label = 'All' }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[13px] border ${
        active
          ? 'border-[#0F6E56] bg-[#E1F5EE] text-[#0F6E56]'
          : 'border-transparent bg-gray-100 text-gray-700'
      }`}
    >
      {label} {count != null && <span className="opacity-60">{count}</span>}
    </button>
  );
}

// A semantic filter pill (stage/status). `pillClass` carries the page's own colour
// (e.g. the STAGES/STATUS map); the shape + amber active-ring are shared. Pass
// `capitalize` for lowercase keys used as labels (e.g. order statuses "draft");
// leave it off for already-cased labels (e.g. "Hot prospect").
export function SalesFilterPill({ active, pillClass = 'bg-gray-100 text-gray-700', count, onClick, capitalize = false, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[13px] ${capitalize ? 'capitalize' : ''} ${pillClass} ${
        active ? 'outline outline-2 outline-[#EF9F27]' : ''
      }`}
    >
      {children} {count != null && <span className="opacity-60">{count}</span>}
    </button>
  );
}

// ── the page shell ───────────────────────────────────────────────────────────
// title     — page title (e.g. "Companies")
// subtitle  — small grey line under it (e.g. "Your pipeline · 8 companies")
// actions   — right-aligned header cluster (search + buttons)
// filters   — the pill row (omit for no filter row)
// maxWidth  — Tailwind max-width; default suits the simple 3–4 column tables,
//             dense tables (Leads) pass 'max-w-7xl'
// children  — the table (grid header + rows), rendered inside the bordered shell
export default function SalesPageLayout({
  title,
  subtitle,
  actions,
  filters,
  maxWidth = 'max-w-5xl',
  children,
}) {
  return (
    <div className={`p-4 md:p-6 ${maxWidth} mx-auto`}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="text-lg font-medium text-gray-900">{title}</div>
          {subtitle != null && <div className="text-[13px] text-gray-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>

      {filters && <div className="flex items-center gap-2 mb-4 flex-wrap">{filters}</div>}

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
}
