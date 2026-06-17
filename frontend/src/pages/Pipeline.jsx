import { useState, useEffect } from 'react';
import { dealService } from '../services/api';

const STAGES = [
  { id: 1, name: 'Qualify', accent: 'border-t-primary-container' },
  { id: 2, name: 'Discovery', accent: 'border-t-secondary-container' },
  { id: 3, name: 'Proposal', accent: 'border-t-tertiary-container' },
  { id: 4, name: 'Negotiation', accent: 'border-t-primary-600' },
];

export default function Pipeline() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await dealService.list();
        setDeals(res.data.filter(d => d.status === 'open'));
      } catch (error) {
        console.error('Failed to fetch pipeline', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-on-surface-variant">Loading pipeline...</div>;

  const stageTotal = (id) => deals.filter(d => (d.stage_id || 1) === id).reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-outline uppercase tracking-widest font-semibold">Sales</p>
        <h1 className="text-2xl font-bold text-on-surface mt-1">Pipeline</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => (d.stage_id || 1) === stage.id);
          return (
            <div key={stage.id} className="bg-surface-container-low rounded-lg border border-outline-variant flex flex-col">
              <div className={`px-4 py-3 border-b border-outline-variant border-t-4 ${stage.accent} rounded-t-lg flex items-center justify-between`}>
                <div>
                  <h2 className="text-sm font-semibold text-on-surface">{stage.name}</h2>
                  <p className="text-xs text-outline">{stageDeals.length} deals · ${stageTotal(stage.id).toLocaleString()}</p>
                </div>
              </div>
              <div className="p-3 space-y-3 flex-1 min-h-[120px]">
                {stageDeals.length === 0 && <p className="text-xs text-outline text-center py-6">No deals</p>}
                {stageDeals.map(deal => (
                  <div key={deal.id} className="bg-surface-container-lowest rounded-lg border border-outline-variant p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-on-surface">#{deal.id}</span>
                      <span className="text-xs text-outline">{Math.round((deal.win_probability || 0) * 100)}%</span>
                    </div>
                    <p className="text-sm font-medium text-on-surface">${Number(deal.amount).toLocaleString()}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{deal.account_id ? `Account ${deal.account_id}` : 'No account'}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
