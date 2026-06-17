import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { productService } from '../services/api';
import { X } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = { name: '', sku: '', unit_price: 0, tax_rate: 0, is_active: 1 };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await productService.list();
      setProducts(res.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({ name: row.name, sku: row.sku || '', unit_price: row.unit_price, tax_rate: row.tax_rate, is_active: row.is_active });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, unit_price: parseFloat(form.unit_price) || 0, tax_rate: parseFloat(form.tax_rate) || 0 };
    try {
      if (editingId) await productService.update(editingId, payload);
      else await productService.create(payload);
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchProducts();
    } catch (error) {
      alert('Failed to save product: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete product "${row.name}"?`)) return;
    try {
      await productService.remove(row.id);
      fetchProducts();
    } catch (error) {
      alert('Failed to delete: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name', render: (row) => <span className="font-medium text-on-surface">{row.name}</span> },
    { header: 'SKU', accessor: 'sku', render: (row) => row.sku || '—' },
    { header: 'Unit Price', accessor: 'unit_price', render: (row) => `$${Number(row.unit_price).toLocaleString()}` },
    { header: 'Tax %', accessor: 'tax_rate', render: (row) => `${row.tax_rate}%` },
    { header: 'Status', accessor: 'is_active', render: (row) => (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-800' : 'bg-surface-container-high text-on-surface-variant'}`}>
        {row.is_active ? 'Active' : 'Inactive'}
      </span>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-full text-on-surface-variant">Loading products...</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-outline uppercase tracking-widest font-semibold">Sales</p>
        <h1 className="text-2xl font-bold text-on-surface mt-1">Products</h1>
      </div>
      <DataTable title="Product Catalog" columns={columns} data={products} onAdd={openCreate} onEdit={openEdit} onDelete={handleDelete} />

      {showModal && (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant">
              <h2 className="text-lg font-bold text-on-surface">{editingId ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-outline hover:text-on-surface"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Name</label>
                <input type="text" required className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">SKU</label>
                <input type="text" className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                  value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Unit Price ($)</label>
                  <input type="number" step="0.01" required className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                    value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Tax Rate (%)</label>
                  <input type="number" step="0.01" className="block w-full border border-outline-variant rounded-md p-2 bg-surface text-sm"
                    value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center text-sm text-on-surface-variant">
                <input type="checkbox" className="mr-2" checked={!!form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} />
                Active
              </label>
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 font-medium">
                {editingId ? 'Save Changes' : 'Create Product'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
