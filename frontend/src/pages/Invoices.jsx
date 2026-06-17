import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { invoiceService } from '../services/api';
import { X } from 'lucide-react';

const STATUS_STYLES = {
  paid: 'bg-green-100 text-green-800',
  issued: 'bg-blue-100 text-blue-800',
  draft: 'bg-surface-container-high text-on-surface',
  overdue: 'bg-red-100 text-red-800',
};

export default function Invoices({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { account_id: '', invoice_number: '', subtotal: 0, tax: 0, status: 'issued' };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      const res = await invoiceService.list();
      setInvoices(res.data);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setFormData(emptyForm); setShowModal(true); };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({ account_id: row.account_id || '', invoice_number: row.invoice_number, subtotal: row.subtotal, tax: row.tax, status: row.status });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await invoiceService.update(editing.id, {
          subtotal: parseFloat(formData.subtotal), tax: parseFloat(formData.tax), status: formData.status,
        });
      } else {
        await invoiceService.create({
          account_id: parseInt(formData.account_id),
          invoice_number: formData.invoice_number || `INV-${Date.now()}`,
          subtotal: parseFloat(formData.subtotal),
          tax: parseFloat(formData.tax),
        });
      }
      setShowModal(false);
      setEditing(null);
      setFormData(emptyForm);
      fetchInvoices();
    } catch (error) {
      alert('Failed to save invoice: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete invoice ${row.invoice_number}?`)) return;
    try {
      await invoiceService.remove(row.id);
      fetchInvoices();
    } catch (error) {
      alert('Failed to delete: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const isOverdue = (row) => row.status !== 'paid' && row.due_date && new Date(row.due_date) < new Date();

  const columns = [
    { header: 'Number', accessor: 'invoice_number' },
    { header: 'Account', accessor: 'account_id', render: (row) => row.account_id ? `Account ${row.account_id}` : '—' },
    { header: 'Total', accessor: 'total', render: (row) => `$${Number(row.total).toLocaleString()}` },
    { header: 'Status', accessor: 'status', render: (row) => {
      const label = isOverdue(row) ? 'overdue' : row.status;
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[label] || 'bg-surface-container-high text-on-surface'}`}>
          {label}
        </span>
      );
    }},
    { header: 'Due Date', accessor: 'due_date', render: (row) => row.due_date ? new Date(row.due_date).toLocaleDateString() : '—' },
  ];

  if (loading) return <div className="flex items-center justify-center h-full">Loading invoices...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Invoices & Payments</h1>
      </div>
      <DataTable title="Billing Overview" columns={columns} data={invoices} onAdd={openCreate} onEdit={openEdit} onDelete={handleDelete} />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editing ? 'Edit Invoice' : 'New Invoice'}</h2>
              <button onClick={() => setShowModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant">Account ID</label>
                    <input type="number" required className="mt-1 block w-full border rounded-md p-2"
                      value={formData.account_id} onChange={e => setFormData({ ...formData, account_id: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant">Invoice Number</label>
                    <input type="text" placeholder="auto-generated if blank" className="mt-1 block w-full border rounded-md p-2"
                      value={formData.invoice_number} onChange={e => setFormData({ ...formData, invoice_number: e.target.value })} />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant">Subtotal ($)</label>
                  <input type="number" step="0.01" required className="mt-1 block w-full border rounded-md p-2"
                    value={formData.subtotal} onChange={e => setFormData({ ...formData, subtotal: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant">Tax ($)</label>
                  <input type="number" step="0.01" className="mt-1 block w-full border rounded-md p-2"
                    value={formData.tax} onChange={e => setFormData({ ...formData, tax: e.target.value })} />
                </div>
              </div>
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant">Status</label>
                  <select className="mt-1 block w-full border rounded-md p-2"
                    value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="issued">Issued</option>
                    <option value="paid">Paid</option>
                    <option value="void">Void</option>
                  </select>
                </div>
              )}
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700">
                {editing ? 'Save Changes' : 'Create Invoice'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
