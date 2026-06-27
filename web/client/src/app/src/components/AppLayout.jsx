// web/client/src/app/src/components/AppLayout.jsx
// REDESIGN: Dark navy sidebar, full-bleed content, 3-state sidebar.
// Desktop/tablet sidebar has three modes (remembered between visits):
//   'rail'     – slim icon-only bar (default)
//   'expanded' – full labelled menu
//   'hidden'   – tucked away for 100% full width (floating button restores it)
// Mobile (<768px) keeps the slide-out drawer.
// Props unchanged: { children, user, isAdmin, onNavigate, lastUpdate, currentView, fullBleed }

import React, { useState, useEffect } from 'react';
import { Menu, PanelLeftOpen } from 'lucide-react';
import Sidebar from './Sidebar';
import VoiceAssistant from './VoiceAssistant';

// ─── currentView → sidebar item id ───────────────────────────────────────────
const VIEW_TO_PAGE = {
  tickets:          'all-tickets',
  calendar:         'ticket-calendar',
  'my-tasks':       'my-tasks',
  'my-pay':         'my-pay',
  'crm-settings':   'crm-settings',
  companies:        'sales',
  leads:            'sales',
  orders:           'sales',
  contracts:        'sales',
  'order-queues':   'order-queues',
  'my-commission':  'my-commission',
  'commission-rules': 'commission-rules',
  'my-wage':        'my-wage',
  'engineer-wages': 'engineer-wages',
  contacts:         'contacts',
  'product-catalog':'product-catalog',
  'crm-calendar':   'crm-calendar',
  quotes:           'sales',
  'sales-calendar': 'sales',
  jobs:             'jobs',
  invoices:         'invoices',
  users:            'manage-users',
  'pricing-config': 'pricing-config',
  billing:          'billing',
  security:         'security',
  'email-intake':   'email-intake',
  'company-notes':  'company-notes',
  'my-notes':       'my-notes',
  'my-holiday':     'my-holiday',
  'holiday-admin':  'holiday-admin',
};

const SIDEBAR_MODE_KEY = 'wt_sidebar_mode';

// ─── MobileHeader ─────────────────────────────────────────────────────────────
const MobileHeader = ({ user, onMenuToggle }) => (
  <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-[#1a1a2e]
                  px-4 flex items-center justify-between flex-shrink-0">
    <button
      onClick={onMenuToggle}
      className="w-9 h-9 rounded-lg flex items-center justify-center
                 hover:bg-[rgba(255,255,255,0.06)] transition-colors"
    >
      <Menu className="w-[22px] h-[22px] text-white" strokeWidth={1.8} />
    </button>

    <span className="text-[15px] font-bold text-white">
      Work<span className="text-[#d4a017]">Trackr</span>
    </span>

    <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
                    flex items-center justify-center text-[11px] font-semibold text-white">
      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
    </div>
  </div>
);

// ─── AppLayout ────────────────────────────────────────────────────────────────
const AppLayout = ({ children, user, isAdmin, isManager, isEngineer, onNavigate, lastUpdate, currentView = 'tickets', fullBleed = false }) => {
  // fullBleed kept for API compatibility; every view is full-bleed dark now.
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Desktop/tablet sidebar mode, remembered between visits.
  const [desktopMode, setDesktopMode] = useState(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_MODE_KEY);
      if (v === 'rail' || v === 'expanded' || v === 'hidden') return v;
    } catch (e) { /* ignore */ }
    return 'rail';
  });
  // Mode to restore to when un-hiding.
  const [restoreMode, setRestoreMode] = useState('rail');

  // Track mobile breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Persist the chosen mode
  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_MODE_KEY, desktopMode); } catch (e) { /* ignore */ }
  }, [desktopMode]);

  // Close mobile drawer on navigation
  const handleNavigation = (view) => {
    setIsMobileMenuOpen(false);
    if (onNavigate) onNavigate(view);
  };

  const currentPage = VIEW_TO_PAGE[currentView] || 'all-tickets';

  // ── Sidebar mode controls ──
  const toggleWidth = () => setDesktopMode((m) => (m === 'expanded' ? 'rail' : 'expanded'));
  const hideSidebar = () => setDesktopMode((m) => { if (m !== 'hidden') setRestoreMode(m); return 'hidden'; });
  const showSidebar = () => setDesktopMode(restoreMode || 'rail');

  const hiddenDesktop = !isMobile && desktopMode === 'hidden';
  const collapsed     = !isMobile && desktopMode === 'rail';
  const desktopWidth  = desktopMode === 'expanded' ? 240 : desktopMode === 'rail' ? 64 : 0;
  const asideWidth    = isMobile ? 240 : desktopWidth;
  const contentMargin = isMobile ? 0 : desktopWidth;
  const asideTransform = isMobile
    ? (isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)')
    : (hiddenDesktop ? 'translateX(-100%)' : 'translateX(0)');

  return (
    <div className="h-screen flex overflow-hidden bg-[#1a1a2e]">

      {/* Mobile header — fixed top, navy, matches sidebar */}
      <MobileHeader user={user} onMenuToggle={() => setIsMobileMenuOpen(o => !o)} />

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Floating "show menu" button when the sidebar is hidden on desktop */}
      {hiddenDesktop && (
        <button
          onClick={showSidebar}
          title="Show menu"
          className="hidden md:flex fixed top-3 left-3 z-50 w-9 h-9 rounded-lg items-center justify-center
                     bg-[#242438] border border-[#2e2e4a] text-[#cbd5e1] hover:text-white hover:bg-[#2a2a48]
                     transition-colors shadow-lg"
        >
          <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </button>
      )}

      {/* Sidebar */}
      <aside
        style={{ width: asideWidth, transform: asideTransform }}
        className="fixed inset-y-0 left-0 z-50 overflow-hidden transition-all duration-300 ease-in-out"
      >
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          user={user}
          isAdmin={isAdmin}
          isManager={isManager}
          isEngineer={isEngineer}
          isCollapsed={isMobile ? false : collapsed}
          onToggleWidth={isMobile ? undefined : toggleWidth}
          onHide={isMobile ? undefined : hideSidebar}
        />
      </aside>

      {/* Main content area — offset by sidebar width on md+ */}
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: contentMargin }}
      >
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0 bg-[#1a1a2e]">
          <div className="min-h-full">{children}</div>
        </main>
      </div>

      {/* ── Global Voice Assistant FAB ─────────────────────────────────────── */}
      <VoiceAssistant currentView={currentView} user={user} />
    </div>
  );
};

export default AppLayout;
