import { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import { adminService } from '../../services/api';
import { X } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_name: 'agent',
    team_id: 1
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminService.listUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminService.createUser(formData);
      setShowModal(false);
      fetchUsers();
      setFormData({ name: '', email: '', password: '', role_name: 'agent', team_id: 1 });
    } catch (error) {
      alert('Failed to create user: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role', render: (row) => (
      <span className="capitalize px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {row.role}
      </span>
    )},
    { header: 'Status', accessor: 'status', render: () => (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    )},
  ];

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">User Management</h1>
      <DataTable 
        title="System Users" 
        columns={columns} 
        data={users} 
        onAdd={() => setShowModal(true)}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create New User</h2>
              <button onClick={() => setShowModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Full Name</label>
                <input 
                  type="text" required
                  className="mt-1 block w-full border rounded-md p-2"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Email</label>
                <input 
                  type="email" required
                  className="mt-1 block w-full border rounded-md p-2"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Password</label>
                <input 
                  type="password" required
                  className="mt-1 block w-full border rounded-md p-2"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Role</label>
                <select 
                  className="mt-1 block w-full border rounded-md p-2"
                  value={formData.role_name}
                  onChange={e => setFormData({...formData, role_name: e.target.value})}
                >
                  <option value="agent">Agent</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Team ID</label>
                <input 
                  type="number" required
                  className="mt-1 block w-full border rounded-md p-2"
                  value={formData.team_id}
                  onChange={e => setFormData({...formData, team_id: parseInt(e.target.value)})}
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700"
              >
                Create User
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
