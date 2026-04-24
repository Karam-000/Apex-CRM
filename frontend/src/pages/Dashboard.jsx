import { 
  Users, Briefcase, TrendingUp, AlertTriangle, 
  Clock, CheckCircle, BarChart3, Activity,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { useState, useEffect } from 'react';
import { reportService } from '../services/api';

const StatCard = ({ label, value, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm">
        <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}%
        </span>
        <span className="ml-2 text-gray-500">vs last month</span>
      </div>
    )}
  </div>
);

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user.role === 'admin';
  const isSupervisor = user.role === 'supervisor';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await reportService.getOverview();
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const revenueData = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 5000 },
    { name: 'Apr', value: 2780 },
    { name: 'May', value: 1890 },
    { name: 'Jun', value: 2390 },
  ];

  if (loading) return <div className="flex items-center justify-center h-full">Loading Dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name}
        </h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Contacts" 
          value={data?.core_totals?.contacts || 0} 
          icon={Users} 
          color="bg-blue-600" 
        />
        <StatCard 
          label="Open Deals" 
          value={data?.core_totals?.open_deals || 0} 
          icon={Briefcase} 
          color="bg-indigo-600" 
        />
        <StatCard 
          label="Forecast Revenue" 
          value={`$${(data?.pipeline?.forecast_value || 0).toLocaleString()}`} 
          icon={TrendingUp} 
          color="bg-emerald-600" 
        />
        <StatCard 
          label="Open Tickets" 
          value={data?.core_totals?.open_tickets || 0} 
          icon={AlertTriangle} 
          color="bg-amber-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Forecast Trend</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Immediate Actions</h2>
          <div className="space-y-4">
            <div className="flex items-start p-3 bg-amber-50 rounded-lg border border-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">SLA Breach Warning</p>
                <p className="text-xs text-amber-700 mt-1">{data?.sla?.currently_breached || 0} tickets require urgent attention.</p>
              </div>
            </div>
            
            <div className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-100">
              <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Pipeline Update</p>
                <p className="text-xs text-blue-700 mt-1">Forecast is up 12% from last week. Great work!</p>
              </div>
            </div>

            <button className="w-full mt-2 flex items-center justify-center px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              View All Alerts <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Section */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="flow-root">
            <ul className="-mb-8">
              {[
                { id: 1, type: 'deal', content: 'New deal created for Acme Corp', time: '2 hours ago' },
                { id: 2, type: 'contact', content: 'John Doe converted to lead', time: '4 hours ago' },
                { id: 3, type: 'ticket', content: 'Support ticket #1234 resolved', time: 'Yesterday' },
                { id: 4, type: 'payment', content: 'Invoice #INV-99 paid', time: 'Yesterday' },
              ].map((item, idx) => (
                <li key={item.id}>
                  <div className="relative pb-8">
                    {idx !== 3 && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center ring-8 ring-white">
                          <Activity className="h-4 w-4 text-primary-600" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">{item.content}</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-400">
                          {item.time}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Items / Alerts */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Focus Areas</h2>
          <div className="space-y-4">
            {isSupervisor && (
              <div className="p-4 bg-amber-50 rounded-md flex">
                <AlertTriangle className="h-5 w-5 text-amber-400 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">Quota Alert</h3>
                  <p className="text-sm text-amber-700 mt-1">Team "West Coast" is 15% behind quota for this month.</p>
                </div>
              </div>
            )}
            <div className="p-4 bg-blue-50 rounded-md flex">
              <Clock className="h-5 w-5 text-blue-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">Next Best Action</h3>
                <p className="text-sm text-blue-700 mt-1">Follow up with TechSolutions about the renewal contract.</p>
              </div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-md flex">
              <CheckCircle className="h-5 w-5 text-emerald-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-emerald-800">Quick Wins</h3>
                <p className="text-sm text-emerald-700 mt-1">3 deals in "Closing" stage ready for invoice generation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
