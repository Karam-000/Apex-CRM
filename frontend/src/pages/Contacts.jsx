import { useState, useEffect, useRef } from 'react';
import DataTable from '../components/DataTable';
import { contactService, emailService } from '../services/api';
import { X, Mail, Send } from 'lucide-react';

const STAGE_STYLES = {
  customer: 'bg-green-100 text-green-800',
  mql: 'bg-purple-100 text-purple-800',
  sql: 'bg-indigo-100 text-indigo-800',
  lead: 'bg-blue-100 text-blue-800',
};

export default function Contacts({ user }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const fileInput = useRef(null);
  const emptyForm = { first_name: '', last_name: '', email: '', phone: '', job_title: '', lifecycle_stage: 'lead' };
  const [formData, setFormData] = useState(emptyForm);
  const [showEmail, setShowEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailForm, setEmailForm] = useState({ contact_id: '', subject: '', body: '' });

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    try {
      const res = await contactService.list();
      setContacts(res.data);
    } catch (error) {
      console.error('Failed to fetch contacts', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditingId(null); setFormData(emptyForm); setShowModal(true); };

  const openEdit = (row) => {
    setEditingId(row.id);
    setFormData({
      first_name: row.first_name || '', last_name: row.last_name || '', email: row.email || '',
      phone: row.phone || '', job_title: row.job_title || '', lifecycle_stage: row.lifecycle_stage || 'lead',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await contactService.update(editingId, formData);
      else await contactService.create(formData);
      setShowModal(false);
      setEditingId(null);
      setFormData(emptyForm);
      fetchContacts();
    } catch (error) {
      alert('Failed to save contact: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete contact "${row.first_name} ${row.last_name}"?`)) return;
    try {
      await contactService.remove(row.id);
      fetchContacts();
    } catch (error) {
      alert('Failed to delete: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const openEmail = () => {
    setEmailForm({ contact_id: contacts[0]?.id || '', subject: '', body: '' });
    setShowEmail(true);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await emailService.send({
        contact_id: parseInt(emailForm.contact_id),
        subject: emailForm.subject,
        body: emailForm.body,
      });
      const s = res.data.status;
      alert(s === 'sent' ? `Email sent to ${res.data.to}.`
        : s === 'dry_run' ? `SMTP not configured — email logged as a draft (not sent). Configure SMTP in .env to send for real.`
        : `Email failed: ${res.data.error || 'unknown error'}`);
      setShowEmail(false);
    } catch (error) {
      alert('Failed to send: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await contactService.bulkUpload(file);
      alert(`Imported ${res.data.created_count} contacts` + (res.data.error_count ? ` (${res.data.error_count} rows failed)` : ''));
      fetchContacts();
    } catch (error) {
      alert('Import failed: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      e.target.value = '';
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name', render: (row) => {
      const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || '—';
      return (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-surface-container-high flex items-center justify-center mr-3 text-xs font-bold text-on-surface-variant">
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium">{name}</span>
        </div>
      );
    }},
    { header: 'Email', accessor: 'email', render: (row) => row.email || '—' },
    { header: 'Phone', accessor: 'phone', render: (row) => row.phone || '—' },
    { header: 'Title', accessor: 'job_title', render: (row) => row.job_title || '—' },
    { header: 'Stage', accessor: 'lifecycle_stage', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STAGE_STYLES[row.lifecycle_stage] || 'bg-surface-container-high text-on-surface'}`}>
        {row.lifecycle_stage}
      </span>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-full">Loading contacts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Contacts</h1>
        <button
          onClick={openEmail}
          disabled={contacts.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface bg-surface-container-lowest hover:bg-surface-container-high transition-colors disabled:opacity-50"
        >
          <Mail className="h-4 w-4" /> Compose Email
        </button>
      </div>
      <input ref={fileInput} type="file" accept=".csv" className="hidden" onChange={handleImport} />
      <DataTable
        title="All Contacts"
        columns={columns}
        data={contacts}
        onAdd={openCreate}
        onImport={() => fileInput.current?.click()}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Contact' : 'New Contact'}</h2>
              <button onClick={() => setShowModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant">First Name</label>
                  <input type="text" required className="mt-1 block w-full border rounded-md p-2"
                    value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant">Last Name</label>
                  <input type="text" required className="mt-1 block w-full border rounded-md p-2"
                    value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Email</label>
                <input type="email" className="mt-1 block w-full border rounded-md p-2"
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Phone</label>
                <input type="text" className="mt-1 block w-full border rounded-md p-2"
                  value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Job Title</label>
                <input type="text" className="mt-1 block w-full border rounded-md p-2"
                  value={formData.job_title} onChange={e => setFormData({ ...formData, job_title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Lifecycle Stage</label>
                <select className="mt-1 block w-full border rounded-md p-2"
                  value={formData.lifecycle_stage} onChange={e => setFormData({ ...formData, lifecycle_stage: e.target.value })}>
                  <option value="lead">Lead</option>
                  <option value="mql">MQL</option>
                  <option value="sql">SQL</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700">
                {editingId ? 'Save Changes' : 'Create Contact'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEmail && (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2"><Mail className="h-5 w-5" /> Compose Email</h2>
              <button onClick={() => setShowEmail(false)} className="text-outline hover:text-on-surface"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Recipient</label>
                <select required className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                  value={emailForm.contact_id} onChange={e => setEmailForm({ ...emailForm, contact_id: e.target.value })}>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {`${c.first_name} ${c.last_name}`.trim()} {c.email ? `<${c.email}>` : '(no email)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Subject</label>
                <input type="text" required className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                  value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Message</label>
                <textarea required rows={5} className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                  value={emailForm.body} onChange={e => setEmailForm({ ...emailForm, body: e.target.value })} />
              </div>
              <button type="submit" disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:opacity-50">
                <Send className="h-4 w-4" /> {sending ? 'Sending...' : 'Send Email'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
