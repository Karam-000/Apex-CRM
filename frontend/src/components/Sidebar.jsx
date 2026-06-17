import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Briefcase, Calendar,
  Ticket, FileText, Settings, Shield,
  Network, Zap, UserCog, CheckCircle, BarChart3,
  UserPlus, GitBranch, Megaphone
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
      active
        ? 'text-primary-container font-bold border-l-2 border-primary-container bg-surface-container-highest/10'
        : 'text-outline-variant hover:text-surface-bright hover:bg-surface-variant/10'
    }`}
  >
    <Icon className={`h-5 w-5 ${active ? 'text-primary-container' : ''}`} />
    <span>{label}</span>
  </Link>
);

export default function Sidebar({ user, isOpen }) {
  const location = useLocation();

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/leads', icon: UserPlus, label: 'Leads', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/contacts', icon: Users, label: 'Contacts', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/pipeline', icon: GitBranch, label: 'Pipeline', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/deals', icon: Briefcase, label: 'Deals', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/campaigns', icon: Megaphone, label: 'Campaigns', roles: ['admin', 'supervisor'] },
    { to: '/activities', icon: Calendar, label: 'Activities', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/tickets', icon: Ticket, label: 'Tickets', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/invoices', icon: FileText, label: 'Invoices', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'supervisor'] },
  ];

  const supervisorItems = [
    { to: '/supervisor/team', icon: UserCog, label: 'Team Management', roles: ['supervisor', 'admin'] },
    { to: '/supervisor/approvals', icon: CheckCircle, label: 'Approvals', roles: ['supervisor', 'admin'] },
  ];

  const adminItems = [
    { to: '/admin/users', icon: Shield, label: 'User Management', roles: ['admin'] },
    { to: '/admin/connectors', icon: Network, label: 'Connectors', roles: ['admin'] },
    { to: '/admin/workflows', icon: Zap, label: 'Workflows', roles: ['admin'] },
    { to: '/admin/settings', icon: Settings, label: 'System Settings', roles: ['admin'] },
  ];

  if (!isOpen) return null;

  const SectionLabel = ({ children }) => (
    <div className="px-4 py-2 mt-4 text-[10px] font-semibold text-outline-variant/70 uppercase tracking-widest">
      {children}
    </div>
  );

  return (
    <aside className="w-64 bg-inverse-surface flex flex-col py-6 shrink-0">
      <div className="px-6 mb-6 flex items-center gap-3">
        <img src="/logo.png" alt="Apex CRM" className="w-9 h-9 rounded-lg object-contain bg-surface-bright p-0.5" />
        <div>
          <h1 className="text-surface-bright font-bold text-lg leading-none tracking-tight">Apex CRM</h1>
          <p className="text-[10px] text-outline-variant uppercase tracking-widest font-semibold mt-0.5">Enterprise SaaS</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <SectionLabel>Main Menu</SectionLabel>
        {menuItems
          .filter(item => item.roles.includes(user.role))
          .map(item => (
            <SidebarLink key={item.to} {...item} active={location.pathname === item.to} />
          ))}

        {(user.role === 'supervisor' || user.role === 'admin') && (
          <>
            <SectionLabel>Management</SectionLabel>
            {supervisorItems.map(item => (
              <SidebarLink key={item.to} {...item} active={location.pathname === item.to} />
            ))}
          </>
        )}

        {user.role === 'admin' && (
          <>
            <SectionLabel>Administration</SectionLabel>
            {adminItems.map(item => (
              <SidebarLink key={item.to} {...item} active={location.pathname === item.to} />
            ))}
          </>
        )}
      </nav>

      <div className="px-4 mt-auto pt-4 border-t border-outline/20">
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-sm font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface-bright truncate">{user.name}</p>
            <p className="text-xs text-outline-variant capitalize">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
