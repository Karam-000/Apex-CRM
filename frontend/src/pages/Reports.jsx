import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Download, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { reportService } from '../services/api';

const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [overview, funnel, activities, channels] = await Promise.all([
          reportService.getOverview(),
          reportService.getFunnel(),
          reportService.getActivities(),
          reportService.getChannels()
        ]);
        setData({
          overview: overview.data,
          funnel: funnel.data,
          activities: activities.data,
          channels: channels.data
        });
      } catch (error) {
        console.error('Failed to fetch reports', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full">Loading Reports...</div>;

  const pipelineData = data?.funnel?.map(item => ({
    stage: `Stage ${item.stage_id}`,
    count: item.count,
    value: item.count
  })) || [];

  const activityData = data?.activities?.map(item => ({
    name: item.type,
    count: item.count
  })) || [];

  const channelData = (data?.channels || []).map(item => ({
    name: item.channel,
    value: item.outbound_count + item.inbound_count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Analytics & Reports</h1>
        <div className="flex space-x-2">
          <button className="flex items-center px-4 py-2 border border-outline-variant rounded-md text-sm font-medium bg-surface-container-lowest hover:bg-surface-container-low">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Value Chart */}
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Pipeline Value by Stage</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Trends */}
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Activity Volume by Type</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Channel Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Metric Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-md">
              <span className="text-sm text-on-surface-variant">Total Contacts</span>
              <span className="font-bold text-on-surface">{data?.overview?.core_totals?.contacts || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-md">
              <span className="text-sm text-on-surface-variant">SLA Breach Rate</span>
              <span className={`font-bold ${data?.overview?.sla?.breach_rate_pct > 20 ? 'text-red-600' : 'text-green-600'}`}>
                {data?.overview?.sla?.breach_rate_pct || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-md">
              <span className="text-sm text-on-surface-variant">Open Tickets</span>
              <span className="font-bold text-on-surface">{data?.overview?.core_totals?.open_tickets || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-md">
              <span className="text-sm text-on-surface-variant">Open Deals</span>
              <span className="font-bold text-on-surface">{data?.overview?.core_totals?.open_deals || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
