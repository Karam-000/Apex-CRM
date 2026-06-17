import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { campaignService } from '../services/api';
import { X } from 'lucide-react';

const STATUS_STYLES = {
  active: 'bg-primary-container/15 text-on-primary-container',
  draft: 'bg-surface-variant text-on-surface-variant',
  paused: 'bg-tertiary-container/20 text-on-tertiary-fixed-variant',
  completed: 'bg-surface-container-high text-on-surface-variant',
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = { name: '', channel: 'email', status: 'draft', source: '', budget: 0 };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await campaignService.list();
      setCampaigns(res.data);
    } catch (error) {
      console.error('Failed to fetch campaigns', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({ name: row.name, channel: row.channel, status: row.status, source: row.source || '', budget: row.budget });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, budget: parseFloat(form.budget) || 0 };
    try {
      if (editingId) await campaignService.update(editingId, payload);
      else await campaignService.create(payload);
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchCampaigns();
    } catch (error) {
      alert('Failed to save campaign: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete campaign "${row.name}"?`)) return;
    try {
      await campaignService.remove(row.id);
      fetchCampaigns();
    } catch (error) {
      alert('Failed to delete: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const columns = [
    { header: 'Campaign', accessor: 'name', render: (row) => <span className="font-medium text-on-surface">{row.name}</span> },
    { header: 'Channel', accessor: 'channel', render: (row) => <span className="capitalize">{row.channel}</span> },
    { header: 'Source', accessor: 'source', render: (row) => row.source || '—' },
    { header: 'Budget', accessor: 'budget', render: (row) => `$${Number(row.budget).toLocaleString()}` },
    { header: 'Status', accessor: 'status', render: (row) => (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[row.status] || 'bg-surface-variant text-on-surface-variant'}`}>
        {row.status}
      </span>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-full text-on-surface-variant">Loading campaigns...</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-outline uppercase tracking-widest font-semibold">Marketing</p>
        <h1 className="text-2xl font-bold text-on-surface mt-1">Campaigns</h1>
      </div>
      <DataTable title="Marketing Campaigns" columns={columns} data={campaigns} onAdd={openCreate} onEdit={openEdit} onDelete={handleDelete} />

      {showModal && (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant">
              <h2 className="text-lg font-bold text-on-surface">{editingId ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button onClick={() => setShowModal(false)} className="text-outline hover:text-on-surface"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1.5">Name</label>
                <input type="text" required className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary-container outline-none"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1.5">Channel</label>
                  <select className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary-container outline-none"
                    value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="social">Social</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1.5">Status</label>
                  <select className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary-container outline-none"
                    value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1.5">Source</label>
                  <input type="text" className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary-container outline-none"
                    value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1.5">Budget ($)</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-md text-sm focus:ring-2 focus:ring-primary-container outline-none"
                    value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 transition-colors font-medium">
                {editingId ? 'Save Changes' : 'Create Campaign'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
