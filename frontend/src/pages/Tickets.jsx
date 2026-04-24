import DataTable from '../components/DataTable';

export default function Tickets({ user }) {
  const columns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Subject', accessor: 'subject', render: (row) => <span className="font-medium">{row.subject}</span> },
    { header: 'Priority', accessor: 'priority', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.priority === 'High' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {row.priority}
      </span>
    )},
    { header: 'Status', accessor: 'status' },
    { header: 'Assigned To', accessor: 'assigned' },
    { header: 'SLA Status', accessor: 'sla', render: (row) => (
      <span className={row.sla === 'Breached' ? 'text-red-600 font-medium' : 'text-green-600'}>
        {row.sla}
      </span>
    )},
  ];

  const data = [
    { id: 'TKT-101', subject: 'Cannot login to portal', priority: 'High', status: 'Open', assigned: 'Support Team', sla: 'Within SLA' },
    { id: 'TKT-102', subject: 'Invoice discrepancy', priority: 'Medium', status: 'In Progress', assigned: 'Billing Dept', sla: 'Within SLA' },
    { id: 'TKT-103', subject: 'Feature request: Dark mode', priority: 'Low', status: 'Closed', assigned: 'Product Team', sla: 'Within SLA' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
      </div>
      <DataTable title="Recent Tickets" columns={columns} data={data} />
    </div>
  );
}
