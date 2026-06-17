import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { dealService } from '../services/api';
import { X, Activity } from 'lucide-react';

const STAGES = { 1: 'Qualify', 2: 'Discovery', 3: 'Proposal', 4: 'Negotiation' };

export default function Deals({ user }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = { account_id: '', primary_contact_id: '', amount: 0, stage_id: 1, win_probability: 0.2, status: 'open' };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { fetchDeals(); }, []);

  const fetchDeals = async () => {
    try {
      const res = await dealService.list();
      setDeals(res.data);
    } catch (error) {
      console.error('Failed to fetch deals', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditingId(null); setFormData(emptyForm); setShowModal(true); };

  const openEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      account_id: row.account_id || '', primary_contact_id: row.primary_contact_id || '',
      amount: row.amount, stage_id: row.stage_id || 1, win_probability: row.win_probability ?? 0.2, status: row.status || 'open',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      account_id: formData.account_id ? parseInt(formData.account_id) : null,
      primary_contact_id: formData.primary_contact_id ? parseInt(formData.primary_contact_id) : null,
      amount: parseFloat(formData.amount),
      stage_id: parseInt(formData.stage_id),
      win_probability: parseFloat(formData.win_probability),
      status: formData.status,
    };
    try {
      if (editingId) await dealService.update(editingId, payload);
      else await dealService.create(payload);
      setShowModal(false);
      setEditingId(null);
      setFormData(emptyForm);
      fetchDeals();
    } catch (error) {
      alert('Failed to save deal: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete deal #${row.id}?`)) return;
    try {
      await dealService.remove(row.id);
      fetchDeals();
    } catch (error) {
      alert('Failed to delete: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleRisk = async (id) => {
    try {
      const res = await dealService.getRiskScore(id);
      alert(`Deal #${id} risk: ${res.data.risk_level.toUpperCase()} (score ${res.data.risk_score})\nNext best action: ${res.data.next_best_action?.action || 'n/a'}`);
    } catch (error) {
      alert('Failed to score deal: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id', render: (row) => <span className="font-medium">#{row.id}</span> },
    { header: 'Account', accessor: 'account_id', render: (row) => row.account_id ? `Account ${row.account_id}` : '—' },
    { header: 'Amount', accessor: 'amount', render: (row) => `$${Number(row.amount).toLocaleString()}` },
    { header: 'Stage', accessor: 'stage_id', render: (row) => (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
        {STAGES[row.stage_id] || `Stage ${row.stage_id}`}
      </span>
    )},
    { header: 'Probability', accessor: 'win_probability', render: (row) => `${Math.round((row.win_probability || 0) * 100)}%` },
    { header: 'Status', accessor: 'status', render: (row) => <span className="capitalize">{row.status?.replace('_', ' ')}</span> },
    { header: 'Risk', accessor: '_risk', render: (row) => (
      <button onClick={() => handleRisk(row.id)} className="flex items-center text-primary-600 hover:text-primary-800 text-sm">
        <Activity className="h-4 w-4 mr-1" /> Score
      </button>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-full">Loading deals...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Deals & Pipeline</h1>
      </div>
      <DataTable title="Active Deals" columns={columns} data={deals} onAdd={openCreate} onEdit={openEdit} onDelete={handleDelete} />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Deal' : 'New Deal'}</h2>
              <button onClick={() => setShowModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant">Account ID</label>
                  <input type="number" className="mt-1 block w-full border rounded-md p-2"
                    value={formData.account_id} onChange={e => setFormData({ ...formData, account_id: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant">Contact ID</label>
                  <input type="number" className="mt-1 block w-full border rounded-md p-2"
                    value={formData.primary_contact_id} onChange={e => setFormData({ ...formData, primary_contact_id: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Amount ($)</label>
                <input type="number" step="0.01" required className="mt-1 block w-full border rounded-md p-2"
                  value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant">Stage</label>
                  <select className="mt-1 block w-full border rounded-md p-2"
                    value={formData.stage_id} onChange={e => setFormData({ ...formData, stage_id: e.target.value })}>
                    {Object.entries(STAGES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant">Win Probability</label>
                  <input type="number" step="0.05" min="0" max="1" className="mt-1 block w-full border rounded-md p-2"
                    value={formData.win_probability} onChange={e => setFormData({ ...formData, win_probability: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Status</label>
                <select className="mt-1 block w-full border rounded-md p-2"
                  value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="open">Open</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700">
                {editingId ? 'Save Changes' : 'Create Deal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
