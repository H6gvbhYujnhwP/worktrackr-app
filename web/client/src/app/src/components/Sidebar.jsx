import React, { useState } from 'react';
import { 
  Home, 
  Ticket, 
  Users, 
  Calendar, 
  Package, 
  FileText, 
  Settings, 
  UserCog, 
  CreditCard, 
  Shield, 
  Mail,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

const Sidebar = ({ currentPage, onNavigate, user, isAdmin }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    tickets: true,
    crm: true,
    settings: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      view: 'tickets'
    },
    {
      id: 'tickets',
      label: 'Tickets',
      icon: Ticket,
      view: 'tickets',
      subItems: [
        { id: 'all-tickets', label: 'All Tickets', view: 'tickets' },
        { id: 'ticket-calendar', label: 'Ticket Calendar', view: 'calendar', icon: Calendar }
      ]
    },
    {
      id: 'crm',
      label: 'CRM',
      icon: Users,
      view: 'crm',
      subItems: [
        { id: 'contacts', label: 'Contacts', view: 'contacts' },
        { id: 'product-catalog', label: 'Product Catalog', view: 'crm', icon: Package },
        { id: 'crm-calendar', label: 'CRM Calendar', view: 'crm-calendar', icon: Calendar },
        { id: 'quotes', label: 'Quotes', view: 'quotes', icon: FileText }
      ]
    }
  ];

  if (isAdmin) {
    navigationItems.push({
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      view: 'users',
      subItems: [
        { id: 'manage-users', label: 'Manage Users', view: 'users', icon: UserCog },
        { id: 'billing', label: 'Billing', view: 'billing', icon: CreditCard },
        { id: 'security', label: 'Security', view: 'security', icon: Shield },
        { id: 'email-intake', label: 'Email Intake', view: 'email-intake', icon: Mail }
      ]
    });
  }

  const handleNavigation = (view) => {
    if (onNavigate) {
      onNavigate(view);
    }
  };

  return (
    <div 
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="16" height="16" rx="2" fill="#1a1a1a" />
              <rect x="7" y="7" width="10" height="2" fill="#fbbf24" />
              <rect x="7" y="11" width="10" height="2" fill="#fbbf24" />
              <rect x="7" y="15" width="6" height="2" fill="#fbbf24" />
            </svg>
            <span className="font-bold text-lg">
              Work<span className="text-yellow-500">Trackr</span>
            </span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const isExpanded = expandedSections[item.id];

          return (
            <div key={item.id} className="mb-1">
              <button
                onClick={() => {
                  if (item.subItems) {
                    toggleSection(item.id);
                  } else {
                    handleNavigation(item.view);
                  }
                }}
                className={`w-full flex items-center px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.subItems && (
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    )}
                  </>
                )}
              </button>

              {/* Sub-items */}
              {item.subItems && !isCollapsed && isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = currentPage === subItem.id;

                    return (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavigation(subItem.view)}
                        className={`w-full flex items-center px-4 py-2 text-sm transition-colors rounded-lg ${
                          isSubActive
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {SubIcon && <SubIcon className="w-4 h-4 mr-2" />}
                        <span>{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-200 p-4">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleNavigation('/logout')}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleNavigation('/logout')}
            className="w-full flex items-center justify-center p-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
