import { useState, useEffect } from 'react';
import { quoteService, productService, openPdfBlob } from '../services/api';
import { Plus, X, Trash2, FileText, ArrowRightLeft } from 'lucide-react';

const STATUS_STYLES = {
  draft: 'bg-surface-variant text-on-surface-variant',
  sent: 'bg-primary-container/15 text-on-primary-container',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  converted: 'bg-secondary-container/15 text-secondary',
};

const emptyLine = { product_id: '', description: '', quantity: 1, unit_price: 0, tax_rate: 0 };

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ account_id: '', contact_id: '', lines: [{ ...emptyLine }] });

  useEffect(() => { refresh(); }, []);

  const refresh = async () => {
    try {
      const [q, p] = await Promise.all([quoteService.list(), productService.list()]);
      setQuotes(q.data);
      setProducts(p.data);
    } catch (error) {
      console.error('Failed to load quotes', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ account_id: '', contact_id: '', lines: [{ ...emptyLine }] });
    setShowModal(true);
  };

  const setLine = (i, patch) => {
    setForm(f => ({ ...f, lines: f.lines.map((ln, idx) => (idx === i ? { ...ln, ...patch } : ln)) }));
  };

  const onPickProduct = (i, productId) => {
    const p = products.find(x => String(x.id) === String(productId));
    setLine(i, p
      ? { product_id: productId, description: p.name, unit_price: p.unit_price, tax_rate: p.tax_rate }
      : { product_id: '' });
  };

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { ...emptyLine }] }));
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));

  const previewTotal = form.lines.reduce((sum, ln) => {
    const sub = (parseFloat(ln.unit_price) || 0) * (parseFloat(ln.quantity) || 0);
    return sum + sub + sub * ((parseFloat(ln.tax_rate) || 0) / 100);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await quoteService.create({
        account_id: form.account_id ? parseInt(form.account_id) : null,
        contact_id: form.contact_id ? parseInt(form.contact_id) : null,
        lines: form.lines.map(ln => ({
          product_id: ln.product_id ? parseInt(ln.product_id) : null,
          description: ln.description,
          quantity: parseFloat(ln.quantity) || 0,
          unit_price: parseFloat(ln.unit_price) || 0,
          tax_rate: parseFloat(ln.tax_rate) || 0,
        })),
      });
      setShowModal(false);
      refresh();
    } catch (error) {
      alert('Failed to create quote: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleConvert = async (q) => {
    if (!window.confirm(`Convert ${q.quote_number} to an order + invoice?`)) return;
    try {
      const res = await quoteService.convert(q.id);
      alert(`Created order ${res.data.order_number} and invoice ${res.data.invoice_number}.`);
      refresh();
    } catch (error) {
      alert('Convert failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDelete = async (q) => {
    if (!window.confirm(`Delete ${q.quote_number}?`)) return;
    try { await quoteService.remove(q.id); refresh(); }
    catch (error) { alert('Delete failed: ' + (error.response?.data?.detail || 'Unknown error')); }
  };

  const handlePdf = async (q) => {
    try {
      const res = await quoteService.pdf(q.id);
      openPdfBlob(res.data);
    } catch (error) {
      alert('PDF failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-on-surface-variant">Loading quotes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-outline uppercase tracking-widest font-semibold">Sales</p>
          <h1 className="text-2xl font-bold text-on-surface mt-1">Quotes</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700">
          <Plus className="h-4 w-4" /> New Quote
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-surface-container-low">
            <tr>
              {['Quote #', 'Account', 'Status', 'Total', 'Actions'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/50">
            {quotes.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-outline">No quotes yet.</td></tr>
            )}
            {quotes.map(q => (
              <tr key={q.id} className="hover:bg-surface-container-low/40">
                <td className="px-6 py-4 text-sm font-medium text-on-surface">{q.quote_number}</td>
                <td className="px-6 py-4 text-sm">{q.account_id ? `Account ${q.account_id}` : '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[q.status] || 'bg-surface-variant text-on-surface-variant'}`}>{q.status}</span>
                </td>
                <td className="px-6 py-4 text-sm">${Number(q.total).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handlePdf(q)} className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800" title="PDF"><FileText className="h-4 w-4" /> PDF</button>
                    {q.status !== 'converted' && (
                      <button onClick={() => handleConvert(q)} className="inline-flex items-center gap-1 text-secondary hover:opacity-80" title="Convert to order + invoice"><ArrowRightLeft className="h-4 w-4" /> Convert</button>
                    )}
                    <button onClick={() => handleDelete(q)} className="text-outline hover:text-error" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant">
              <h2 className="text-lg font-bold text-on-surface">New Quote</h2>
              <button onClick={() => setShowModal(false)} className="text-outline hover:text-on-surface"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Account ID</label>
                  <input type="number" className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                    value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Contact ID</label>
                  <input type="number" className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                    value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-on-surface-variant">Line Items</label>
                  <button type="button" onClick={addLine} className="text-sm text-primary-600 hover:underline flex items-center gap-1"><Plus className="h-4 w-4" /> Add line</button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((ln, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <select className="col-span-3 border border-outline-variant rounded-md p-2 bg-surface text-xs"
                        value={ln.product_id} onChange={e => onPickProduct(i, e.target.value)}>
                        <option value="">Custom</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input className="col-span-4 border border-outline-variant rounded-md p-2 bg-surface text-xs" placeholder="Description"
                        value={ln.description} onChange={e => setLine(i, { description: e.target.value })} />
                      <input type="number" step="0.01" className="col-span-1 border border-outline-variant rounded-md p-2 bg-surface text-xs" title="Qty"
                        value={ln.quantity} onChange={e => setLine(i, { quantity: e.target.value })} />
                      <input type="number" step="0.01" className="col-span-2 border border-outline-variant rounded-md p-2 bg-surface text-xs" title="Unit price"
                        value={ln.unit_price} onChange={e => setLine(i, { unit_price: e.target.value })} />
                      <input type="number" step="0.01" className="col-span-1 border border-outline-variant rounded-md p-2 bg-surface text-xs" title="Tax %"
                        value={ln.tax_rate} onChange={e => setLine(i, { tax_rate: e.target.value })} />
                      <button type="button" onClick={() => removeLine(i)} className="col-span-1 text-outline hover:text-error flex justify-center"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-12 gap-2 text-[10px] text-outline uppercase tracking-wider mt-1 px-1">
                  <span className="col-span-3">Product</span><span className="col-span-4">Description</span>
                  <span className="col-span-1">Qty</span><span className="col-span-2">Unit</span><span className="col-span-1">Tax%</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                <span className="text-sm text-on-surface-variant">Estimated total</span>
                <span className="text-lg font-bold text-on-surface">${previewTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 font-medium">Create Quote</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
