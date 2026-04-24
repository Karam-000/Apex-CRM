import DataTable from '../components/DataTable';

export default function Invoices({ user }) {
  const columns = [
    { header: 'Number', accessor: 'id' },
    { header: 'Account', accessor: 'account' },
    { header: 'Amount', accessor: 'amount', render: (row) => `$${row.amount.toLocaleString()}` },
    { header: 'Status', accessor: 'status', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
      }`}>
        {row.status}
      </span>
    )},
    { header: 'Due Date', accessor: 'due' },
  ];

  const data = [
    { id: 'INV-001', account: 'Acme Corp', amount: 5000, status: 'Paid', due: '2024-04-01' },
    { id: 'INV-002', account: 'TechSolutions', amount: 1200, status: 'Overdue', due: '2024-04-15' },
    { id: 'INV-003', account: 'Global Ind', amount: 15000, status: 'Pending', due: '2024-05-01' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices & Payments</h1>
      </div>
      <DataTable title="Billing Overview" columns={columns} data={data} />
    </div>
  );
}
