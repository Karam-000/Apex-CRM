import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Search, Calendar, LogOut, HelpCircle } from 'lucide-react';
import NotificationsPanel from './NotificationsPanel';
import CalendarPanel from './CalendarPanel';
import HelpModal from './HelpModal';

export default function Navbar({ user, onLogout, toggleSidebar }) {
  // Which dropdown is open: 'notif' | 'calendar' | null
  const [openPanel, setOpenPanel] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const actionsRef = useRef(null);

  // Close dropdowns when clicking outside the actions cluster.
  useEffect(() => {
    if (!openPanel) return;
    const handler = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setOpenPanel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPanel]);

  const toggle = (panel) => setOpenPanel((cur) => (cur === panel ? null : panel));

  return (
    <header className="h-16 bg-surface border-b border-outline-variant flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-on-surface-variant hover:bg-surface-container-high"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            className="pl-10 pr-4 py-2 w-64 bg-surface-container-low border border-outline-variant rounded-full text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all"
            placeholder="Search Apex CRM..."
            type="search"
          />
        </div>
      </div>

      <div className="flex items-center gap-2" ref={actionsRef}>
        {/* Help */}
        <button
          onClick={() => setShowHelp(true)}
          title="Help & getting started"
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => toggle('notif')}
            title="Notifications"
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors relative ${
              openPanel === 'notif' ? 'bg-surface-container-high text-primary-700' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-error ring-2 ring-surface"></span>
          </button>
          {openPanel === 'notif' && (
            <NotificationsPanel user={user} onClose={() => setOpenPanel(null)} />
          )}
        </div>

        {/* Calendar */}
        <div className="relative">
          <button
            onClick={() => toggle('calendar')}
            title="Calendar"
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              openPanel === 'calendar' ? 'bg-surface-container-high text-primary-700' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <Calendar className="h-5 w-5" />
          </button>
          {openPanel === 'calendar' && (
            <CalendarPanel user={user} onClose={() => setOpenPanel(null)} />
          )}
        </div>

        <div className="h-8 w-px bg-outline-variant mx-2"></div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-sm font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={onLogout}
            className="flex items-center text-sm font-medium text-on-surface-variant hover:text-primary-600"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showHelp && <HelpModal user={user} onClose={() => setShowHelp(false)} />}
    </header>
  );
}
