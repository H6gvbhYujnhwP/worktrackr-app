// web/client/src/app/src/components/SalesPageLayout.jsx
// Phase 8 (UX consolidation) — the single chrome shared by every Sales tab page
// (Companies / Leads / Quotes / Orders / Contracts). Extracted from the Leads tab
// look so the pages can't drift apart again: same page wrapper + width, same
// header (title + count subtitle + right-aligned actions, optional search), same
// rounded-full filter-pill row, same bordered/rounded table shell.
//
// v3.6 — DARK opt-in. The redesign flips Companies/Quotes/Orders to the dark
// "Relationship Hub" look. Those three pass `dark` (to the shell AND to every
// building block they render). Leads/Contracts are NOT yet redesigned, so they
// pass nothing and keep the original light look byte-for-byte — the dark path is
// purely additive. Also adds `bare` so the Companies pipeline (columns of cards)
// can skip the single bordered table shell.
//
// A page builds its header actions from <SalesSearch>, <SalesPrimaryButton> and
// <SalesSecondaryButton>; its filter row from <SalesAllPill> + <SalesFilterPill>;
// and passes its own table (grid header + rows) as children.
//
// Light accent (Leads/Contracts, unchanged):
//   primary green #1D9E75 · active toggle #0F6E56 on #E1F5EE · active pill ring #EF9F27
// Dark accent (redesign): amber #f59e0b on cards #242438 / base #1a1a2e.
import React from 'react';
import { Search, Plus } from 'lucide-react';
import PageHero, { HeroButtonOutline, HeroButtonPrimary } from './PageHero.jsx';

// ── header building blocks ───────────────────────────────────────────────────

// Bordered search box. value/onChange required; placeholder optional.
export function SalesSearch({ value, onChange, placeholder = 'Search…', width = 'w-48', dark = false }) {
  return (
    <div className={`flex items-center gap-2 border rounded-lg px-3 h-9 ${
      dark ? 'border-[#2e2e4a] bg-[#242438]' : 'border-gray-300 bg-white'
    }`}>
      <Search className={`w-4 h-4 ${dark ? 'text-[#6b7280]' : 'text-gray-400'}`} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`text-[13px] outline-none ${width} bg-transparent ${
          dark ? 'text-white placeholder:text-[#6b7280]' : ''
        }`}
      />
    </div>
  );
}

// Primary action. Light = green fill; dark = amber fill with dark text (Manus).
export function SalesPrimaryButton({ icon: Icon = Plus, children, onClick, dark = false, ...rest }) {
  return (
    <button
      onClick={onClick}
      className={`h-9 inline-flex items-center gap-1.5 rounded-lg px-3.5 text-[13px] ${
        dark
          ? 'bg-[#f59e0b] text-[#1a1a2e] hover:bg-[#d97706] font-medium'
          : 'bg-[#1D9E75] text-white hover:bg-[#16835f]'
      }`}
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4" />} {children}
    </button>
  );
}

// Secondary action (e.g. "Import"). `active` gives the toggle treatment.
export function SalesSecondaryButton({ icon: Icon, children, onClick, active = false, dark = false, ...rest }) {
  const cls = dark
    ? (active
        ? 'border-[#f59e0b] bg-[rgba(245,158,11,0.15)] text-[#fcd34d]'
        : 'border-[#2e2e4a] text-[#94a3b8] hover:bg-[#2a2a48]')
    : (active
        ? 'border-[#0F6E56] bg-[#E1F5EE] text-[#0F6E56]'
        : 'border-gray-300 text-gray-700 hover:bg-gray-50');
  return (
    <button
      onClick={onClick}
      className={`h-9 inline-flex items-center gap-1.5 rounded-lg border px-3 text-[13px] ${cls}`}
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4" />} {children}
    </button>
  );
}

// ── filter pills ─────────────────────────────────────────────────────────────

// The "All" pill: highlighted when selected, neutral otherwise.
export function SalesAllPill({ active, count, onClick, label = 'All', dark = false }) {
  const cls = dark
    ? (active
        ? 'border-[#f59e0b] bg-[rgba(245,158,11,0.15)] text-[#fcd34d]'
        : 'border-transparent bg-[#242438] text-[#94a3b8]')
    : (active
        ? 'border-[#0F6E56] bg-[#E1F5EE] text-[#0F6E56]'
        : 'border-transparent bg-gray-100 text-gray-700');
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-[13px] border ${cls}`}>
      {label} {count != null && <span className="opacity-60">{count}</span>}
    </button>
  );
}

// A semantic filter pill (stage/status). `pillClass` carries the page's own colour;
// the shape + amber active-ring are shared. `capitalize` for lowercase labels.
export function SalesFilterPill({ active, pillClass = 'bg-gray-100 text-gray-700', count, onClick, capitalize = false, dark = false, children }) {
  const ring = active ? (dark ? 'outline outline-2 outline-[#f59e0b]' : 'outline outline-2 outline-[#EF9F27]') : '';
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[13px] ${capitalize ? 'capitalize' : ''} ${pillClass} ${ring}`}
    >
      {children} {count != null && <span className="opacity-60">{count}</span>}
    </button>
  );
}

// ── the page shell ───────────────────────────────────────────────────────────
// title    — page title (e.g. "Companies")
// subtitle — small line under it (e.g. "Your pipeline · 8 companies")
// actions  — right-aligned header cluster (search + buttons)
// filters  — the pill / toggle row (omit for none)
// maxWidth — Tailwind max-width; dark pages default to full width
// dark     — flip to the redesign's dark look (default false = light, unchanged)
// bare     — skip the bordered shell around children (for the kanban columns)
// children — the body (table grid, or columns)
export default function SalesPageLayout({
  title,
  subtitle,
  actions,
  filters,
  maxWidth,
  dark = false,   // kept for backwards-compat; all pages are now dark
  bare = false,
  icon,           // optional lucide icon for the hero
  heroMeta = [],  // optional [{icon, label}] for the hero meta row
  children,
}) {
  return (
    <div className="p-5 md:p-7 min-h-full bg-[#1a1a2e] max-w-none mx-auto">
      {/* Glowing hero header on every page */}
      <div className="mb-5">
        <PageHero
          title={title}
          icon={icon}
          meta={heroMeta}
          actions={actions}
          compact
        />
      </div>

      {filters && <div className="flex items-center gap-2 mb-4 flex-wrap">{filters}</div>}

      {bare ? (
        children
      ) : (
        <div className="border rounded-xl overflow-hidden border-[#2e2e4a] bg-[#242438]">
          {children}
        </div>
      )}
    </div>
  );
}
