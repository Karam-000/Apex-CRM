import { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import { adminService } from '../../services/api';

export default function Team() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await adminService.listUsers();
        // Filter only agents for the supervisor
        setAgents(response.data.filter(u => u.role === 'agent'));
      } catch (error) {
        console.error('Failed to fetch agents', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  const columns = [
    { header: 'Agent Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Status', accessor: 'status', render: (row) => (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    )},
  ];

  if (loading) return <div>Loading team...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Team Management</h1>
      <DataTable title="Team Agents" columns={columns} data={agents} />
    </div>
  );
}
