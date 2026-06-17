import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { ticketService } from '../services/api';
import { X } from 'lucide-react';

const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-surface-container-high text-on-surface',
};

export default function Tickets({ user }) {
  const [tickets, setTickets] = useState([]);
  const [slaMap, setSlaMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = { subject: '', priority: 'medium', status: 'open', category: '', contact_id: '' };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    try {
      const res = await ticketService.list();
      setTickets(res.data);
      // Pull SLA status for each ticket (best-effort; not all have a policy).
      const entries = await Promise.all(res.data.map(async (t) => {
        try {
          const sla = await ticketService.getSla(t.id);
          return [t.id, sla.data.breach_flag ? 'Breached' : 'Within SLA'];
        } catch {
          return [t.id, '—'];
        }
      }));
      setSlaMap(Object.fromEntries(entries));
    } catch (error) {
      console.error('Failed to fetch tickets', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditingId(null); setFormData(emptyForm); setShowModal(true); };

  const openEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      subject: row.subject || '', priority: row.priority || 'medium', status: row.status || 'open',
      category: row.category || '', contact_id: row.contact_id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await ticketService.update(editingId, {
          subject: formData.subject, priority: formData.priority, status: formData.status,
          category: formData.category || null,
        });
      } else {
        await ticketService.create({
          subject: formData.subject, priority: formData.priority, category: formData.category || null,
          contact_id: formData.contact_id ? parseInt(formData.contact_id) : null,
        });
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(emptyForm);
      fetchTickets();
    } catch (error) {
      alert('Failed to save ticket: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ticket TKT-${row.id}?`)) return;
    try {
      await ticketService.remove(row.id);
      fetchTickets();
    } catch (error) {
      alert('Failed to delete: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id', render: (row) => `TKT-${row.id}` },
    { header: 'Subject', accessor: 'subject', render: (row) => <span className="font-medium">{row.subject}</span> },
    { header: 'Priority', accessor: 'priority', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLES[row.priority] || 'bg-surface-container-high text-on-surface'}`}>
        {row.priority}
      </span>
    )},
    { header: 'Status', accessor: 'status', render: (row) => <span className="capitalize">{row.status}</span> },
    { header: 'Assigned', accessor: 'assigned_user_id', render: (row) => row.assigned_user_id ? `User ${row.assigned_user_id}` : 'Unassigned' },
    { header: 'SLA', accessor: '_sla', render: (row) => {
      const v = slaMap[row.id] || '…';
      return <span className={v === 'Breached' ? 'text-red-600 font-medium' : v === 'Within SLA' ? 'text-green-600' : 'text-outline'}>{v}</span>;
    }},
  ];

  if (loading) return <div className="flex items-center justify-center h-full">Loading tickets...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Support Tickets</h1>
      </div>
      <DataTable title="Recent Tickets" columns={columns} data={tickets} onAdd={openCreate} onEdit={openEdit} onDelete={handleDelete} />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Ticket' : 'New Ticket'}</h2>
              <button onClick={() => setShowModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Subject</label>
                <input type="text" required className="mt-1 block w-full border rounded-md p-2"
                  value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant">Priority</label>
                  <select className="mt-1 block w-full border rounded-md p-2"
                    value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                {editingId ? (
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant">Status</label>
                    <select className="mt-1 block w-full border rounded-md p-2"
                      value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="escalated">Escalated</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant">Contact ID</label>
                    <input type="number" className="mt-1 block w-full border rounded-md p-2"
                      value={formData.contact_id} onChange={e => setFormData({ ...formData, contact_id: e.target.value })} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Category</label>
                <input type="text" className="mt-1 block w-full border rounded-md p-2"
                  value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700">
                {editingId ? 'Save Changes' : 'Create Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
