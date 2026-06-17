import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function MainLayout({ children, user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-surface">
      <Sidebar user={user} isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          user={user}
          onLogout={onLogout}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 bg-surface">
          {children}
        </main>
      </div>
    </div>
  );
}
