import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Deals from './pages/Deals';
import Tickets from './pages/Tickets';
import Invoices from './pages/Invoices';
import Activities from './pages/Activities';
import Reports from './pages/Reports';
import Users from './pages/admin/Users';
import Settings from './pages/admin/Settings';
import Connectors from './pages/admin/Connectors';
import Workflows from './pages/admin/Workflows';
import Team from './pages/supervisor/Team';
import Approvals from './pages/supervisor/Approvals';
import Login from './pages/Login';
import api, { authService } from './services/api';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('apex_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const userData = response.data;
      
      // Store in memory and storage
      setUser(userData);
      localStorage.setItem('apex_user', JSON.stringify(userData));
      
      // Force API defaults
      api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      
      return { success: true };
    } catch (error) {
      console.error('Login failed', error);
      return { 
        success: false, 
        message: error.response?.data?.detail || 'Invalid email or password' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('apex_user');
  };

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <Router>
      <MainLayout user={user} onLogout={logout}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/contacts" element={<Contacts user={user} />} />
          <Route path="/deals" element={<Deals user={user} />} />
          <Route path="/activities" element={<Activities user={user} />} />
          <Route path="/tickets" element={<Tickets user={user} />} />
          <Route path="/invoices" element={<Invoices user={user} />} />
          <Route path="/reports" element={<Reports user={user} />} />
          
          {/* Admin Routes */}
          {user.role === 'admin' && (
            <>
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/connectors" element={<Connectors />} />
              <Route path="/admin/workflows" element={<Workflows />} />
            </>
          )}

          {/* Supervisor Routes */}
          {(user.role === 'supervisor' || user.role === 'admin') && (
            <>
              <Route path="/supervisor/team" element={<Team />} />
              <Route path="/supervisor/approvals" element={<Approvals />} />
            </>
          )}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
