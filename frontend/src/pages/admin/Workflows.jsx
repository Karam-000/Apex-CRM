import DataTable from '../../components/DataTable';

export default function Workflows() {
  const columns = [
    { header: 'Workflow Name', accessor: 'name' },
    { header: 'Trigger', accessor: 'trigger' },
    { header: 'Action', accessor: 'action' },
    { header: 'Status', accessor: 'status', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {row.status}
      </span>
    )},
  ];

  const data = [
    { name: 'Welcome Email', trigger: 'New Contact Created', action: 'Send Email', status: 'Active' },
    { name: 'High Value Lead Alert', trigger: 'Lead Score > 80', action: 'Slack Notify', status: 'Active' },
    { name: 'SLA Breach Warning', trigger: 'Ticket Open > 2h', action: 'Notify Manager', status: 'Inactive' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Workflows & Automation</h1>
      <DataTable title="Workflow Definitions" columns={columns} data={data} />
    </div>
  );
}
