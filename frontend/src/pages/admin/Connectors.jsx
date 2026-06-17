import { useState, useEffect } from 'react';
import { connectorService } from '../../services/api';
import { Plus, X, Send, Wifi, Download, Eye, EyeOff, RefreshCw, Trash2, Pencil, Copy } from 'lucide-react';

const emptyForm = { name: '', system_type: 'slack', base_url: '', outbound_secret: '', is_active: 1 };

export default function Connectors() {
  const [connectors, setConnectors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pushModal, setPushModal] = useState(null);
  const [pushForm, setPushForm] = useState({ kind: 'contact', entityId: '', dryRun: true });
  const [revealed, setRevealed] = useState({});
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { refresh(); }, []);

  const refresh = async () => {
    try {
      const [c, l] = await Promise.all([connectorService.list(), connectorService.logs()]);
      setConnectors(c.data);
      setLogs(l.data);
    } catch (error) {
      console.error('Failed to load connectors', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, system_type: c.system_type, base_url: c.base_url || '', outbound_secret: c.outbound_secret || '', is_active: c.is_active });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await connectorService.update(editing.id, form);
      else await connectorService.create(form);
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      refresh();
    } catch (error) {
      alert('Failed to save connector: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete connector "${c.name}"? This also removes its sync logs.`)) return;
    try { await connectorService.remove(c.id); refresh(); }
    catch (error) { alert('Delete failed: ' + (error.response?.data?.detail || 'Unknown error')); }
  };

  const handleRegenerate = async (c) => {
    if (!window.confirm(`Regenerate API key for "${c.name}"? The old key stops working immediately.`)) return;
    try { await connectorService.regenerateKey(c.id); refresh(); }
    catch (error) { alert('Regenerate failed: ' + (error.response?.data?.detail || 'Unknown error')); }
  };

  const handleDeleteKey = async (c) => {
    if (!window.confirm(`Delete the API key for "${c.name}"?`)) return;
    try { await connectorService.deleteKey(c.id); refresh(); }
    catch (error) { alert('Delete key failed: ' + (error.response?.data?.detail || 'Unknown error')); }
  };

  const handleTest = async (id) => {
    try {
      const res = await connectorService.test(id, true);
      alert('Connection test (dry-run):\n' + JSON.stringify(res.data, null, 2));
    } catch (error) {
      alert('Test failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handlePush = async (e) => {
    e.preventDefault();
    try {
      const id = pushModal.id;
      const eid = parseInt(pushForm.entityId);
      const res = pushForm.kind === 'contact'
        ? await connectorService.pushContact(id, eid, pushForm.dryRun)
        : await connectorService.pushDeal(id, eid, pushForm.dryRun);
      alert('Push result:\n' + JSON.stringify(res.data, null, 2));
      setPushModal(null);
      setPushForm({ kind: 'contact', entityId: '', dryRun: true });
      refresh();
    } catch (error) {
      alert('Push failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const copyKey = (key) => { navigator.clipboard?.writeText(key); };

  if (loading) return <div className="flex items-center justify-center h-full">Loading connectors...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Connectors & Integrations</h1>
        <button onClick={openCreate}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700">
          <Plus className="h-4 w-4 mr-2" /> Add Connector
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface">Active Connectors</h2>
          <p className="text-sm text-outline mt-1">Each connector is secured by a generated API key used to authenticate push/pull traffic.</p>
        </div>
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-low">
            <tr>
              {['Name', 'Type', 'API Key', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-outline uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface-container-lowest divide-y divide-outline-variant">
            {connectors.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-outline">No connectors yet. Add one to push data to external apps.</td></tr>
            )}
            {connectors.map(c => (
              <tr key={c.id} className="hover:bg-surface-container-low align-top">
                <td className="px-6 py-4 text-sm font-medium text-on-surface">{c.name}<div className="text-xs text-outline truncate max-w-[12rem]">{c.base_url || 'no endpoint'}</div></td>
                <td className="px-6 py-4 text-sm capitalize">{c.system_type}</td>
                <td className="px-6 py-4 text-sm">
                  {c.api_key ? (
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-surface-container-high px-2 py-1 rounded font-mono">
                        {revealed[c.id] ? c.api_key : '••••••••' + c.api_key.slice(-4)}
                      </code>
                      <button onClick={() => setRevealed({ ...revealed, [c.id]: !revealed[c.id] })} title="Show/Hide" className="text-outline hover:text-on-surface-variant">
                        {revealed[c.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button onClick={() => copyKey(c.api_key)} title="Copy" className="text-outline hover:text-on-surface-variant"><Copy className="h-4 w-4" /></button>
                      <button onClick={() => handleRegenerate(c)} title="Regenerate" className="text-amber-500 hover:text-amber-700"><RefreshCw className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteKey(c)} title="Delete key" className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => handleRegenerate(c)} className="text-xs text-primary-600 hover:underline">Generate key</button>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-surface-container-high text-on-surface'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-3 whitespace-nowrap">
                  <button onClick={() => handleTest(c.id)} className="inline-flex items-center text-primary-600 hover:text-primary-800"><Wifi className="h-4 w-4 mr-1" /> Test</button>
                  <button onClick={() => setPushModal(c)} className="inline-flex items-center text-indigo-600 hover:text-indigo-800"><Send className="h-4 w-4 mr-1" /> Push</button>
                  <button onClick={() => openEdit(c)} className="inline-flex items-center text-on-surface-variant hover:text-on-surface"><Pencil className="h-4 w-4 mr-1" /> Edit</button>
                  <button onClick={() => handleDelete(c)} className="inline-flex items-center text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4 mr-1" /> Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center">
          <Download className="h-4 w-4 mr-2 text-outline" />
          <h2 className="text-lg font-semibold text-on-surface">Recent Sync Activity</h2>
        </div>
        <table className="min-w-full divide-y divide-outline-variant">
          <thead className="bg-surface-container-low">
            <tr>
              {['Direction', 'Entity', 'Status', 'When'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-outline uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface-container-lowest divide-y divide-outline-variant">
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-outline">No sync activity yet.</td></tr>
            )}
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-surface-container-low">
                <td className="px-6 py-4 text-sm capitalize">{l.direction}</td>
                <td className="px-6 py-4 text-sm">{l.entity_type}{l.entity_id ? ` #${l.entity_id}` : ''}</td>
                <td className="px-6 py-4 text-sm"><span className={l.status === 'success' ? 'text-green-600' : 'text-red-600'}>{l.status}</span></td>
                <td className="px-6 py-4 text-sm text-outline">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / edit connector modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editing ? 'Edit Connector' : 'New Connector'}</h2>
              <button onClick={() => setShowModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Name</label>
                <input type="text" required className="mt-1 block w-full border rounded-md p-2"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">System Type</label>
                <select className="mt-1 block w-full border rounded-md p-2"
                  value={form.system_type} onChange={e => setForm({ ...form, system_type: e.target.value })}>
                  <option value="slack">Slack</option>
                  <option value="mailchimp">Mailchimp</option>
                  <option value="stripe">Stripe</option>
                  <option value="custom">Custom Webhook</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Base URL (webhook endpoint)</label>
                <input type="url" placeholder="https://hooks.example.com/..." className="mt-1 block w-full border rounded-md p-2"
                  value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">HMAC Secret (optional, signs outbound)</label>
                <input type="text" className="mt-1 block w-full border rounded-md p-2"
                  value={form.outbound_secret} onChange={e => setForm({ ...form, outbound_secret: e.target.value })} />
              </div>
              {editing && (
                <label className="flex items-center text-sm text-on-surface-variant">
                  <input type="checkbox" className="mr-2" checked={!!form.is_active}
                    onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} />
                  Active
                </label>
              )}
              {!editing && (
                <p className="text-xs text-outline">An API key will be generated automatically and shown in the table.</p>
              )}
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700">
                {editing ? 'Save Changes' : 'Create Connector'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Push modal */}
      {pushModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Push to {pushModal.name}</h2>
              <button onClick={() => setPushModal(null)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handlePush} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Entity</label>
                <select className="mt-1 block w-full border rounded-md p-2"
                  value={pushForm.kind} onChange={e => setPushForm({ ...pushForm, kind: e.target.value })}>
                  <option value="contact">Contact</option>
                  <option value="deal">Deal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Entity ID</label>
                <input type="number" required className="mt-1 block w-full border rounded-md p-2"
                  value={pushForm.entityId} onChange={e => setPushForm({ ...pushForm, entityId: e.target.value })} />
              </div>
              <label className="flex items-center text-sm text-on-surface-variant">
                <input type="checkbox" className="mr-2" checked={pushForm.dryRun}
                  onChange={e => setPushForm({ ...pushForm, dryRun: e.target.checked })} />
                Dry run (preview payload only, don't actually send)
              </label>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">
                {pushForm.dryRun ? 'Preview Payload' : 'Send to External System'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
