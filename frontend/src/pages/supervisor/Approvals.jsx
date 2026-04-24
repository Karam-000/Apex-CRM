import DataTable from '../../components/DataTable';

export default function Approvals() {
  const columns = [
    { header: 'Request ID', accessor: 'id' },
    { header: 'Type', accessor: 'type' },
    { header: 'Requested By', accessor: 'requestedBy' },
    { header: 'Amount', accessor: 'amount', render: (row) => row.amount ? `$${row.amount.toLocaleString()}` : 'N/A' },
    { header: 'Date', accessor: 'date' },
    { header: 'Status', accessor: 'status', render: (row) => (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        {row.status}
      </span>
    )},
  ];

  const data = [
    { id: 'APP-001', type: 'Discount Approval', requestedBy: 'Alice Agent', amount: 5000, date: '2024-04-24', status: 'Pending' },
    { id: 'APP-002', type: 'Contract Approval', requestedBy: 'Bob Smith', amount: null, date: '2024-04-23', status: 'Pending' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
      <DataTable title="Requests Needing Action" columns={columns} data={data} />
    </div>
  );
}
