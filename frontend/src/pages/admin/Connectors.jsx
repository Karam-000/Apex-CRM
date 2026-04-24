import DataTable from '../../components/DataTable';

export default function Connectors() {
  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Type', accessor: 'type' },
    { header: 'Status', accessor: 'status', render: (row) => (
      <span className={row.status === 'Connected' ? 'text-green-600 font-medium' : 'text-red-600'}>
        {row.status}
      </span>
    )},
    { header: 'Last Sync', accessor: 'lastSync' },
  ];

  const data = [
    { name: 'Slack Integration', type: 'Notification', status: 'Connected', lastSync: '5 mins ago' },
    { name: 'Mailchimp', type: 'Marketing', status: 'Disconnected', lastSync: 'N/A' },
    { name: 'Stripe', type: 'Payments', status: 'Connected', lastSync: '1 hour ago' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Connectors & Integrations</h1>
      <DataTable title="Active Connectors" columns={columns} data={data} />
    </div>
  );
}
