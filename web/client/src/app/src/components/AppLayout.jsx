// web/client/src/app/src/components/AppLayout.jsx
// REDESIGN: Dark sidebar, clean top bar, NO double content wrapper.
// All views render directly on #f5f5f7 bg — no inner white card.
// Sidebar collapse: auto-icon-only on tablet (768-1023px), drawer on mobile (<768px).
// Props unchanged: { children, user, isAdmin, onNavigate, lastUpdate, currentView }

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import VoiceAssistant from './VoiceAssistant';

// ─── currentView → sidebar item id ───────────────────────────────────────────
const VIEW_TO_PAGE = {
  tickets:          'all-tickets',
  calendar:         'ticket-calendar',
  contacts:         'contacts',
  'product-catalog':'product-catalog',
  'crm-calendar':   'crm-calendar',
  quotes:           'quotes',
  jobs:             'jobs',
  users:            'manage-users',
  'pricing-config': 'pricing-config',
  billing:          'billing',
  security:         'security',
  'email-intake':   'email-intake',
  'company-notes':  'company-notes',
  'my-notes':       'my-notes',
};

// ─── MobileHeader ─────────────────────────────────────────────────────────────
const MobileHeader = ({ user, onMenuToggle }) => (
  <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-[#111113]
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
const AppLayout = ({ children, user, isAdmin, onNavigate, lastUpdate, currentView = 'tickets' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Detect tablet breakpoint for auto-collapsed sidebar
  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close mobile drawer on navigation
  const handleNavigation = (view) => {
    setIsMobileMenuOpen(false);
    if (onNavigate) onNavigate(view);
  };

  const currentPage = VIEW_TO_PAGE[currentView] || 'all-tickets';

  // Sidebar width: desktop=240px, tablet=64px, mobile=off-screen
  const sidebarWidth = isTablet ? 64 : 240;

  return (
    <div className="h-screen flex overflow-hidden bg-[#f5f5f7]">

      {/* Mobile header — fixed top, dark, matches sidebar */}
      <MobileHeader user={user} onMenuToggle={() => setIsMobileMenuOpen(o => !o)} />

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ width: sidebarWidth }}
        className={`
          fixed inset-y-0 left-0 z-50
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigation}
          user={user}
          isAdmin={isAdmin}
          isCollapsed={isTablet}
        />
      </aside>

      {/* Main content area — offset by sidebar width on md+ */}
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: typeof window !== 'undefined' && window.innerWidth >= 768 ? sidebarWidth : 0 }}
      >
        {/* Content — NO double wrapper. Children render directly on gray bg. */}
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <div className="p-4 md:p-6 lg:p-7 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ── Global Voice Assistant FAB — floats above all content ─────────── */}
      <VoiceAssistant currentView={currentView} user={user} />
    </div>
  );
};

export default AppLayout;
