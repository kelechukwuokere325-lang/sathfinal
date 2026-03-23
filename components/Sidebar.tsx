import React from 'react';
import { LayoutDashboard, Users, Calculator, FileText, Bot, UserCircle, ClipboardList, TrendingUp, Moon, Sun, MessageSquare, Target, MapPin, ShieldCheck, Calendar, Settings as SettingsIcon } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  openIssueCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  isDarkMode, 
  toggleDarkMode, 
  openIssueCount = 0,
  isOpen = false,
  onClose,
  onLogout
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'employees', label: 'Employee Register', icon: <Users size={20} /> },
    { id: 'attendance', label: 'Attendance', icon: <Calendar size={20} /> },
    { id: 'performance', label: 'Performance', icon: <Target size={20} /> },
    { id: 'payroll', label: 'Run Payroll', icon: <Calculator size={20} /> },
    { id: 'forecasting', label: 'Cost Forecasting', icon: <TrendingUp size={20} /> },
    { id: 'reports', label: 'Compliance & Reports', icon: <FileText size={20} /> },
    { id: 'verification', label: 'Staff Verification', icon: <ShieldCheck size={20} /> },
    { id: 'audit-logs', label: 'Audit Logs', icon: <ClipboardList size={20} /> },
    { id: 'audit', label: 'AI Auditor', icon: <Bot size={20} /> },
    { id: 'locator', label: 'Service Locator', icon: <MapPin size={20} /> },
    { id: 'settings', label: 'System Settings', icon: <SettingsIcon size={20} /> },
    { id: 'help-desk', label: 'Help Desk', icon: <MessageSquare size={20} />, badge: openIssueCount },
    { id: 'portal', label: 'Employee Portal', icon: <UserCircle size={20} /> },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 dark:bg-black text-white flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              PayPulse
            </h1>
            <p className="text-xs text-slate-400 mt-1">Efficient Payroll for SMEs</p>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400"
          >
            <Sun size={20} className="rotate-45" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-200 ${
                currentView === item.id
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 dark:hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
              </div>
              {item.badge ? (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                  </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <button
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span className="text-sm font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                MA
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Mr. Adebayo</p>
                <p className="text-xs text-slate-400">HR Manager</p>
              </div>
            </div>
            {onLogout && (
              <button 
                onClick={onLogout}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                title="Logout / Switch Role"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;