// web/client/src/app/src/components/AppLayout.jsx
// REDESIGN: Dark sidebar, clean top bar, NO double content wrapper.
// All views render directly on #f5f5f7 bg — no inner white card.
// Sidebar collapse: auto-icon-only on tablet (768-1023px), drawer on mobile (<768px).
// Props unchanged: { children, user, isAdmin, onNavigate, lastUpdate, currentView }

import React, { useState, useEffect } from 'react';
import { Menu, X, Bell, Search, Plus } from 'lucide-react';
import Sidebar from './Sidebar';

// ─── Page title map ───────────────────────────────────────────────────────────
const PAGE_TITLES = {
  tickets:          'Tickets',
  calendar:         'Ticket Calendar',
  contacts:         'Contacts',
  'product-catalog':'Products',
  quotes:           'Quotes',
  'crm-calendar':   'CRM Calendar',
  users:            'User Management',
  billing:          'Billing',
  'pricing-config': 'Pricing Configuration',
  security:         'Security',
  'email-intake':   'Email Intake',
};

// Context-aware primary action per view
const PRIMARY_ACTIONS = {
  tickets:          { label: '+ New Ticket',   view: 'tickets'         },
  contacts:         { label: '+ New Contact',  view: 'contacts'        },
  quotes:           { label: '+ New Quote',    view: 'quotes'          },
  'product-catalog':{ label: '+ New Product',  view: 'product-catalog' },
  'crm-calendar':   { label: '+ New Event',    view: 'crm-calendar'    },
  calendar:         { label: '+ New Event',    view: 'calendar'        },
};

// ─── currentView → sidebar item id ───────────────────────────────────────────
const VIEW_TO_PAGE = {
  tickets:          'all-tickets',
  calendar:         'ticket-calendar',
  contacts:         'contacts',
  'product-catalog':'product-catalog',
  'crm-calendar':   'crm-calendar',
  quotes:           'quotes',
  users:            'manage-users',
  'pricing-config': 'pricing-config',
  billing:          'billing',
  security:         'security',
  'email-intake':   'email-intake',
};

// ─── TopBar ───────────────────────────────────────────────────────────────────
const TopBar = ({ title, currentView, onNavigate }) => {
  const action = PRIMARY_ACTIONS[currentView];

  return (
    <header className="hidden md:flex h-14 bg-white border-b border-[#e5e7eb]
                        px-7 items-center justify-between sticky top-0 z-30 flex-shrink-0">
      <h1 className="text-base font-bold text-[#1d1d1f]">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search hint */}
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#e5e7eb]
                        rounded-lg text-xs text-[#9ca3af] bg-[#fafafa] cursor-pointer
                        hover:border-[#d1d5db] transition-colors min-w-[200px]">
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1">Search...</span>
          <kbd className="text-[10px] bg-white border border-[#e5e7eb] rounded px-1.5 py-0.5
                          font-sans leading-none">⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className="w-[34px] h-[34px] rounded-lg flex items-center justify-center
                           hover:bg-[#f3f4f6] transition-colors relative">
          <Bell className="w-[18px] h-[18px] text-[#6b7280]" strokeWidth={1.8} />
          <span className="absolute top-[7px] right-[7px] w-2 h-2 bg-[#d4a017] rounded-full" />
        </button>

        {/* Context-aware primary action */}
        {action && (
          <button
            onClick={() => onNavigate && onNavigate(action.view)}
            className="bg-[#d4a017] text-[#111113] px-4 py-2 rounded-lg text-[13px]
                       font-semibold hover:bg-[#c4920f] transition-all hover:-translate-y-px
                       active:translate-y-0 whitespace-nowrap"
          >
            {action.label}
          </button>
        )}
      </div>
    </header>
  );
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
  const pageTitle   = PAGE_TITLES[currentView] || 'WorkTrackr';

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
        {/* Desktop top bar */}
        <TopBar
          title={pageTitle}
          currentView={currentView}
          onNavigate={handleNavigation}
        />

        {/* Content — NO double wrapper. Children render directly on gray bg. */}
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <div className="p-4 md:p-6 lg:p-7 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
