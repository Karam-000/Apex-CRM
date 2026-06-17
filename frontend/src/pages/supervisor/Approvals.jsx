import { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import { approvalService } from '../../services/api';
import { Check, X } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchApprovals(); }, []);

  const fetchApprovals = async () => {
    try {
      const res = await approvalService.list();
      setApprovals(res.data);
    } catch (error) {
      console.error('Failed to fetch approvals', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id, approved) => {
    try {
      await approvalService.decide(id, approved);
      fetchApprovals();
    } catch (error) {
      alert('Failed to record decision: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id', render: (row) => `APP-${row.id}` },
    { header: 'Type', accessor: 'request_type' },
    { header: 'Entity', accessor: 'entity_type', render: (row) => `${row.entity_type} #${row.entity_id}` },
    { header: 'Requested By', accessor: 'requested_by_name' },
    { header: 'Status', accessor: 'status', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[row.status] || 'bg-surface-container-high text-on-surface'}`}>
        {row.status}
      </span>
    )},
    { header: 'Decision', accessor: '_decision', render: (row) => (
      row.status === 'pending' ? (
        <div className="flex space-x-2">
          <button onClick={() => handleDecision(row.id, true)} className="p-1 hover:bg-green-50 text-green-600 rounded" title="Approve">
            <Check className="h-5 w-5" />
          </button>
          <button onClick={() => handleDecision(row.id, false)} className="p-1 hover:bg-red-50 text-red-600 rounded" title="Reject">
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : <span className="text-outline text-sm">Decided</span>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-full">Loading approvals...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Pending Approvals</h1>
      <DataTable title="Requests Needing Action" columns={columns} data={approvals} />
    </div>
  );
}
