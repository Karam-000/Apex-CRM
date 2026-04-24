import DataTable from '../components/DataTable';

export default function Deals({ user }) {
  const columns = [
    { header: 'Deal Name', accessor: 'name', render: (row) => <span className="font-medium">{row.name}</span> },
    { header: 'Account', accessor: 'account' },
    { header: 'Amount', accessor: 'amount', render: (row) => `$${row.amount.toLocaleString()}` },
    { header: 'Stage', accessor: 'stage', render: (row) => (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
        {row.stage}
      </span>
    )},
    { header: 'Probability', accessor: 'prob', render: (row) => `${row.prob}%` },
    { header: 'Close Date', accessor: 'date' },
  ];

  const data = [
    { name: 'Enterprise License', account: 'Acme Corp', amount: 50000, stage: 'Negotiation', prob: 75, date: '2024-05-15' },
    { name: 'SaaS Subscription', account: 'TechSolutions', amount: 12000, stage: 'Discovery', prob: 20, date: '2024-06-01' },
    { name: 'Cloud Migration', account: 'Global Ind', amount: 125000, stage: 'Proposal', prob: 40, date: '2024-07-20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Deals & Pipeline</h1>
      </div>
      <DataTable 
        title="Active Deals" 
        columns={columns} 
        data={data} 
        onImport={() => alert('Bulk Deal Import triggered!')}
      />
    </div>
  );
}
