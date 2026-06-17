import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import api, { adminService, activityService } from '../services/api';
import { Plus, X, CheckCircle2, PhoneOff, PhoneIncoming, Clock } from 'lucide-react';

export default function Activities({ user }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState([]);
  const [formData, setFormData] = useState({
    type: 'Task',
    subject: '',
    owner_user_id: user.user_id || user.id,
    contact_id: null
  });

  const isSupervisor = user.role === 'supervisor' || user.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [activitiesRes, usersRes] = await Promise.all([
        activityService.list(),
        adminService.listUsers()
      ]);
      
      const userMap = {};
      usersRes.data.forEach(u => userMap[u.id] = u.name);

      setActivities(activitiesRes.data.map(act => ({
        ...act,
        owner: act.owner_user_id === (user.user_id || user.id) ? 'Self' : (userMap[act.owner_user_id] || `Agent ID: ${act.owner_user_id}`)
      })));
      
      // Optimize by setting agents from the same users list
      setAgents(usersRes.data.filter(u => u.role === 'agent'));
    } catch (error) {
      console.error('Failed to fetch activities', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    // Agents are now fetched in fetchData to avoid duplicate API calls
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await activityService.create(formData);
      setShowModal(false);
      fetchData();
      setFormData({
        type: 'Task',
        subject: '',
        owner_user_id: user.user_id || user.id,
        contact_id: null
      });
    } catch (error) {
      alert('Failed to create activity: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleUpdateOutcome = async (activityId, outcome) => {
    try {
      await activityService.update(activityId, { outcome });
      fetchData();
    } catch (error) {
      alert('Failed to update activity outcome');
    }
  };

  const columns = [
    { header: 'Type', accessor: 'type' },
    { header: 'Subject', accessor: 'subject', render: (row) => <span className="font-medium">{row.subject}</span> },
    { header: 'Owner', accessor: 'owner' },
    { header: 'Status/Outcome', accessor: 'outcome', render: (row) => (
      row.outcome ? (
        <span className={`flex items-center text-sm font-medium ${
          row.outcome === 'Call Done' ? 'text-green-600' : 
          row.outcome === 'Not Interested' ? 'text-red-600' : 'text-amber-600'
        }`}>
          {row.outcome === 'Call Done' && <CheckCircle2 className="h-4 w-4 mr-1" />}
          {row.outcome === 'Not Interested' && <PhoneOff className="h-4 w-4 mr-1" />}
          {row.outcome === "Didn't Answer" && <PhoneIncoming className="h-4 w-4 mr-1" />}
          {row.outcome}
        </span>
      ) : (
        <div className="flex space-x-2">
          <button 
            onClick={() => handleUpdateOutcome(row.id, 'Call Done')}
            className="p-1 hover:bg-green-50 text-green-600 rounded" title="Call Done"
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
          <button 
            onClick={() => handleUpdateOutcome(row.id, 'Not Interested')}
            className="p-1 hover:bg-red-50 text-red-600 rounded" title="Not Interested"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
          <button 
            onClick={() => handleUpdateOutcome(row.id, "Didn't Answer")}
            className="p-1 hover:bg-amber-50 text-amber-600 rounded" title="Didn't Answer"
          >
            <PhoneIncoming className="h-5 w-5" />
          </button>
        </div>
      )
    )},
    { header: 'Completed At', accessor: 'completed_at', render: (row) => row.completed_at ? new Date(row.completed_at).toLocaleString() : '-' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Activities</h1>
      </div>
      
      <DataTable 
        title="Tasks & Meetings" 
        columns={columns} 
        data={activities} 
        onAdd={() => setShowModal(true)}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Assign New Task</h2>
              <button onClick={() => setShowModal(false)}><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Subject</label>
                <input 
                  type="text" 
                  required
                  className="mt-1 block w-full border border-outline-variant rounded-md shadow-sm py-2 px-3 focus:ring-primary-container focus:border-primary-container sm:text-sm"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant">Type</label>
                <select 
                  className="mt-1 block w-full border border-outline-variant rounded-md shadow-sm py-2 px-3 focus:ring-primary-container focus:border-primary-container sm:text-sm"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option>Task</option>
                  <option>Call</option>
                  <option>Meeting</option>
                </select>
              </div>
                {isSupervisor && (
                  <div className="sm:col-span-4">
                    <label className="block text-sm font-medium text-on-surface-variant">Assign To Agent</label>
                    <select 
                      className="mt-1 block w-full border border-outline-variant rounded-md shadow-sm py-2 px-3 focus:ring-primary-container focus:border-primary-container sm:text-sm"
                      value={formData.owner_user_id}
                      onChange={e => setFormData({...formData, owner_user_id: parseInt(e.target.value)})}
                    >
                      <option value={user.user_id || user.id}>Self</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-container"
                >
                  Create Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
