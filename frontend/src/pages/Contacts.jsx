import DataTable from '../components/DataTable';

export default function Contacts({ user }) {
  const columns = [
    { header: 'Name', accessor: 'name', render: (row) => (
      <div className="flex items-center">
        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 text-xs font-bold text-gray-600">
          {row.name.charAt(0)}
        </div>
        <span className="font-medium">{row.name}</span>
      </div>
    )},
    { header: 'Account', accessor: 'account' },
    { header: 'Email', accessor: 'email' },
    { header: 'Status', accessor: 'status', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.status === 'Customer' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
      }`}>
        {row.status}
      </span>
    )},
    { header: 'Lead Score', accessor: 'score', render: (row) => (
      <div className="flex items-center">
        <div className="w-16 bg-gray-200 rounded-full h-1.5 mr-2">
          <div className="bg-primary-600 h-1.5 rounded-full" style={{ width: `${row.score}%` }}></div>
        </div>
        <span>{row.score}</span>
      </div>
    )},
  ];

  const data = [
    { name: 'John Doe', account: 'Acme Corp', email: 'john@acme.com', status: 'Customer', score: 85 },
    { name: 'Jane Smith', account: 'TechSolutions', email: 'jane@tech.io', status: 'Lead', score: 42 },
    { name: 'Bob Johnson', account: 'Global Ind', email: 'bob@global.com', status: 'Customer', score: 91 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
      </div>
      <DataTable 
        title="All Contacts" 
        columns={columns} 
        data={data} 
        onImport={() => alert('Bulk CSV Import triggered! Please select a file.')}
      />
    </div>
  );
}
