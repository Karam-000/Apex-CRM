import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { leadService } from '../services/api';
import { Zap } from 'lucide-react';

const STAGE_STYLES = {
  lead: 'bg-primary-container/15 text-on-primary-container',
  mql: 'bg-secondary-container/15 text-secondary',
  sql: 'bg-tertiary-container/20 text-on-tertiary-fixed-variant',
};

const GRADE_STYLES = { A: 'text-primary-600', B: 'text-secondary', C: 'text-tertiary', D: 'text-error' };

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const res = await leadService.list();
      setLeads(res.data);
    } catch (error) {
      console.error('Failed to fetch leads', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async (id) => {
    try {
      const res = await leadService.score(id);
      alert(`Lead #${id} scored: ${res.data.score} (Grade ${res.data.grade})`);
      fetchLeads();
    } catch (error) {
      alert('Failed to score lead: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name', render: (row) => {
      const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || '—';
      return (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-on-surface-variant">
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-on-surface">{name}</span>
        </div>
      );
    }},
    { header: 'Email', accessor: 'email', render: (row) => row.email || '—' },
    { header: 'Title', accessor: 'job_title', render: (row) => row.job_title || '—' },
    { header: 'Stage', accessor: 'lifecycle_stage', render: (row) => (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STAGE_STYLES[row.lifecycle_stage] || 'bg-surface-variant text-on-surface-variant'}`}>
        {row.lifecycle_stage}
      </span>
    )},
    { header: 'Lead Score', accessor: 'score', render: (row) => (
      row.score != null ? (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-surface-variant rounded-full h-1.5">
            <div className="bg-primary-container h-1.5 rounded-full" style={{ width: `${Math.min(row.score, 100)}%` }}></div>
          </div>
          <span className={`text-sm font-semibold ${GRADE_STYLES[row.grade] || 'text-on-surface'}`}>{row.score} ({row.grade})</span>
        </div>
      ) : <span className="text-outline text-sm">unscored</span>
    )},
    { header: 'Score', accessor: '_action', render: (row) => (
      <button onClick={() => handleScore(row.id)} className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium">
        <Zap className="h-4 w-4" /> Score
      </button>
    )},
  ];

  if (loading) return <div className="flex items-center justify-center h-full text-on-surface-variant">Loading leads...</div>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-outline uppercase tracking-widest font-semibold">Marketing</p>
        <h1 className="text-2xl font-bold text-on-surface mt-1">Leads</h1>
      </div>
      <DataTable title="Early-Stage Leads" columns={columns} data={leads} />
    </div>
  );
}
