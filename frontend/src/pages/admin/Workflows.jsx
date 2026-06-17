import { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import { workflowService } from '../../services/api';
import { X } from 'lucide-react';

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', trigger_type: 'contact_created' });

  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await workflowService.list();
      setWorkflows(res.data);
    } catch (error) {
      console.error('Failed to fetch workflows', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await workflowService.create(formData);
      setShowModal(false);
      setFormData({ name: '', trigger_type: 'contact_created' });
      fetchWorkflows();
    } catch (error) {
      alert('Failed to create workflow: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete workflow "${row.name}"?`)) return;
    try {
      await workflowService.remove(row.id);
      fetchWorkflows();
    } catch (error) {
      alert('Failed to delete: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const columns = [
    { header: 'Workflow Name', accessor: 'name', render: (row) => <span className="font-medium">{row.name}</span> },
    { header: 'Trigger', accessor: 'trigger_type' },
    { header: 'Rules', accessor: 'rule_count' },
    { header: 'Status', accessor: 'is_active', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-800' : 'bg-surface-container-high text-on-surface'}`}>
        {row.is_active ? 'Active' : 'Inactive'}
      </span>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-full">Loading workflows...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Workflows & Automation</h1>
      <DataTable title="Workflow Definitions" columns={columns} data={workflows} onAdd={() => setShowModal(true)} onDelete={handleDelete} />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">New Workflow</h2>
              <button onClick={() => setShowModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Name</label>
                <input type="text" required className="mt-1 block w-full border rounded-md p-2"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Trigger Type</label>
                <select className="mt-1 block w-full border rounded-md p-2"
                  value={formData.trigger_type} onChange={e => setFormData({ ...formData, trigger_type: e.target.value })}>
                  <option value="contact_created">Contact Created</option>
                  <option value="deal_created">Deal Created</option>
                  <option value="ticket_created">Ticket Created</option>
                  <option value="lead_scored">Lead Scored</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700">
                Create Workflow
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
