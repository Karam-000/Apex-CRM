import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, Calendar, 
  Ticket, FileText, Settings, Shield, 
  Network, Zap, UserCog, CheckCircle, BarChart3
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
      active 
        ? 'bg-primary-600 text-white' 
        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`}
  >
    <Icon className="mr-3 h-5 w-5" />
    {label}
  </Link>
);

export default function Sidebar({ user, isOpen }) {
  const location = useLocation();

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/contacts', icon: Users, label: 'Contacts', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/deals', icon: Briefcase, label: 'Deals', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/activities', icon: Calendar, label: 'Activities', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/tickets', icon: Ticket, label: 'Tickets', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/invoices', icon: FileText, label: 'Invoices', roles: ['admin', 'supervisor', 'agent'] },
    { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'supervisor'] },
  ];

  const adminItems = [
    { to: '/admin/users', icon: Shield, label: 'User Management', roles: ['admin'] },
    { to: '/admin/connectors', icon: Network, label: 'Connectors', roles: ['admin'] },
    { to: '/admin/workflows', icon: Zap, label: 'Workflows', roles: ['admin'] },
    { to: '/admin/settings', icon: Settings, label: 'System Settings', roles: ['admin'] },
  ];

  const supervisorItems = [
    { to: '/supervisor/team', icon: UserCog, label: 'Team Management', roles: ['supervisor', 'admin'] },
    { to: '/supervisor/approvals', icon: CheckCircle, label: 'Approvals', roles: ['supervisor', 'admin'] },
  ];

  if (!isOpen) return null;

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 flex items-center">
        <img src="/logo.png" alt="Apex CRM" className="h-8 w-auto mr-3" />
        <span className="text-xl font-bold tracking-tight">Apex CRM</span>
      </div>

      <nav className="flex-1 mt-4">
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Main Menu
        </div>
        {menuItems
          .filter(item => item.roles.includes(user.role))
          .map(item => (
            <SidebarLink 
              key={item.to} 
              {...item} 
              active={location.pathname === item.to} 
            />
          ))}

        {(user.role === 'supervisor' || user.role === 'admin') && (
          <>
            <div className="px-4 py-2 mt-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Management
            </div>
            {supervisorItems.map(item => (
              <SidebarLink 
                key={item.to} 
                {...item} 
                active={location.pathname === item.to} 
              />
            ))}
          </>
        )}

        {user.role === 'admin' && (
          <>
            <div className="px-4 py-2 mt-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Administration
            </div>
            {adminItems.map(item => (
              <SidebarLink 
                key={item.to} 
                {...item} 
                active={location.pathname === item.to} 
              />
            ))}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
