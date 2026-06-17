import { Menu, Bell, Search, Calendar, LogOut } from 'lucide-react';

export default function Navbar({ user, onLogout, toggleSidebar }) {
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

      <div className="flex items-center gap-2">
        <button className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-error ring-2 ring-surface"></span>
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <Calendar className="h-5 w-5" />
        </button>

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
    </header>
  );
}
