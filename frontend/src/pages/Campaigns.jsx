import { useState, useEffect, useRef } from 'react';
import DataTable from '../components/DataTable';
import { campaignService, downloadBlob } from '../services/api';
import { X, Send, Upload, Download } from 'lucide-react';

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

  const [sendModal, setSendModal] = useState(null);
  const [sendForm, setSendForm] = useState({ subject: '', body: '' });
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await campaignService.send(sendModal.id, sendForm);
      const d = res.data;
      alert(`Campaign "${sendModal.name}" processed:\n` +
        `sent: ${d.sent}, dry-run: ${d.dry_run}, failed: ${d.failed}, skipped (no email): ${d.skipped} of ${d.total}.` +
        (d.dry_run ? '\n\nNote: SMTP not configured — those were logged as drafts.' : ''));
      setSendModal(null);
      setSendForm({ subject: '', body: '' });
      fetchCampaigns();
    } catch (error) {
      alert('Failed to send: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ subject: '', body: '' });
  const [broadcasting, setBroadcasting] = useState(false);
  const fileInput = useRef(null);

  const handleSampleCsv = async () => {
    try {
      const res = await campaignService.sampleCsv();
      downloadBlob(res.data, 'campaign_recipients_sample.csv');
    } catch (error) {
      alert('Failed to download sample: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) { alert('Please choose a CSV file.'); return; }
    setBroadcasting(true);
    try {
      const res = await campaignService.broadcast({ subject: broadcastForm.subject, body: broadcastForm.body, file });
      const d = res.data;
      alert(`Broadcast processed ${d.total} rows:\nsent: ${d.sent}, dry-run: ${d.dry_run}, failed: ${d.failed}, skipped: ${d.skipped}.` +
        (d.dry_run ? '\n\nNote: SMTP not configured — those were not delivered.' : ''));
      setShowBroadcast(false);
      setBroadcastForm({ subject: '', body: '' });
      if (fileInput.current) fileInput.current.value = '';
    } catch (error) {
      alert('Broadcast failed: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setBroadcasting(false);
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
    { header: 'Send', accessor: '_send', render: (row) => (
      <button onClick={() => { setSendModal(row); setSendForm({ subject: '', body: '' }); }}
        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
        <Send className="h-4 w-4" /> Send
      </button>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-full text-on-surface-variant">Loading campaigns...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-outline uppercase tracking-widest font-semibold">Marketing</p>
          <h1 className="text-2xl font-bold text-on-surface mt-1">Campaigns</h1>
        </div>
        <button onClick={() => { setBroadcastForm({ subject: '', body: '' }); setShowBroadcast(true); }}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface bg-surface-container-lowest hover:bg-surface-container-high transition-colors">
          <Upload className="h-4 w-4" /> Broadcast (CSV)
        </button>
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

      {sendModal && (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2"><Send className="h-5 w-5" /> Send "{sendModal.name}"</h2>
              <button onClick={() => setSendModal(null)} className="text-outline hover:text-on-surface"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSend} className="p-6 space-y-4">
              <p className="text-xs text-on-surface-variant">
                Emails {sendModal.source ? <>contacts with lead source <span className="font-medium">"{sendModal.source}"</span></> : 'all contacts'} that have an email address.
              </p>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Subject</label>
                <input type="text" required className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                  value={sendForm.subject} onChange={e => setSendForm({ ...sendForm, subject: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Message</label>
                <textarea required rows={5} className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                  value={sendForm.body} onChange={e => setSendForm({ ...sendForm, body: e.target.value })} />
              </div>
              <button type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:opacity-50">
                <Send className="h-4 w-4" /> {sending ? 'Sending...' : 'Send Campaign'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showBroadcast && (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2"><Upload className="h-5 w-5" /> Bulk Broadcast</h2>
              <button onClick={() => setShowBroadcast(false)} className="text-outline hover:text-on-surface"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleBroadcast} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-on-surface-variant">Recipients CSV</label>
                <button type="button" onClick={handleSampleCsv} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
                  <Download className="h-3.5 w-3.5" /> Download sample CSV
                </button>
              </div>
              <input ref={fileInput} type="file" accept=".csv" required
                className="block w-full text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-surface-container-high file:text-on-surface file:text-sm" />
              <p className="text-xs text-outline">CSV columns: <code>email,name</code>. Use <code>{'{{name}}'}</code> in the message to personalize.</p>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Subject</label>
                <input type="text" required className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                  value={broadcastForm.subject} onChange={e => setBroadcastForm({ ...broadcastForm, subject: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Message</label>
                <textarea required rows={5} className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                  value={broadcastForm.body} onChange={e => setBroadcastForm({ ...broadcastForm, body: e.target.value })} />
              </div>
              <button type="submit" disabled={broadcasting}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:opacity-50">
                <Upload className="h-4 w-4" /> {broadcasting ? 'Broadcasting...' : 'Send Broadcast'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
