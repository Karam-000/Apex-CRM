import { useState, useEffect } from 'react';
import {
  Users, Briefcase, TrendingUp, TrendingDown, AlertTriangle,
  Activity as ActivityIcon, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { reportService, activityService } from '../services/api';

const COLORS = ['#0ea5e9', '#6063ee', '#de8712', '#4648d4', '#89ceff'];

const StatCard = ({ label, value, icon: Icon, trend, accent = 'bg-primary-container' }) => (
  <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-outline uppercase tracking-wider">{label}</span>
      <div className={`p-2 rounded-lg ${accent}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
    <div className="text-2xl font-bold text-on-surface">{value}</div>
    {trend && (
      <div className="mt-3 flex items-center gap-1 text-xs">
        {trend.isPositive
          ? <TrendingUp className="h-4 w-4 text-primary-600" />
          : <TrendingDown className="h-4 w-4 text-error" />}
        <span className={trend.isPositive ? 'text-primary-600 font-semibold' : 'text-error font-semibold'}>{trend.value}</span>
        <span className="text-outline">{trend.label}</span>
      </div>
    )}
  </div>
);

const STAGE_NAMES = { 1: 'Qualify', 2: 'Discovery', 3: 'Proposal', 4: 'Negotiation' };

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [channelData, setChannelData] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSupervisor = user.role === 'supervisor' || user.role === 'admin';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [overview, forecast, funnel, channels, activities] = await Promise.all([
          reportService.getOverview(),
          reportService.getForecast(),
          reportService.getFunnel(),
          reportService.getChannels(),
          activityService.list(),
        ]);
        setData(overview.data);
        const byMonth = forecast.data?.expected_revenue_by_month || {};
        setRevenueData(
          Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }))
        );
        setFunnelData((funnel.data || []).map(s => ({ stage: STAGE_NAMES[s.stage_id] || `Stage ${s.stage_id}`, count: s.count })));
        setChannelData((channels.data || []).map(c => ({ name: c.channel, value: c.outbound_count + c.inbound_count })));
        setRecent(activities.data.slice(0, 6));
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-on-surface-variant">Loading Dashboard...</div>;

  const totals = data?.core_totals || {};
  const forecastValue = data?.pipeline?.forecast_value || 0;
  const slaBreached = data?.sla?.currently_breached || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-outline uppercase tracking-widest font-semibold">Executive Overview</p>
          <h1 className="text-2xl font-bold text-on-surface mt-1">Welcome back, {user.name}</h1>
        </div>
        <div className="text-sm text-on-surface-variant">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Contacts" value={totals.contacts ?? 0} icon={Users} accent="bg-primary-container"
          trend={{ isPositive: true, value: '+5%', label: 'vs last month' }} />
        <StatCard label="Open Deals" value={totals.open_deals ?? 0} icon={Briefcase} accent="bg-secondary-container"
          trend={{ isPositive: true, value: '+12%', label: 'vs last month' }} />
        <StatCard label="Forecast Revenue" value={`$${Number(forecastValue).toLocaleString()}`} icon={TrendingUp} accent="bg-tertiary-container"
          trend={{ isPositive: true, value: 'weighted', label: 'open pipeline' }} />
        <StatCard label="Open Tickets" value={totals.open_tickets ?? 0} icon={AlertTriangle} accent="bg-error"
          trend={slaBreached > 0 ? { isPositive: false, value: `${slaBreached} breached`, label: 'SLA' } : { isPositive: true, value: 'on track', label: 'SLA' }} />
      </div>

      {/* Revenue forecast + immediate actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-on-surface">Revenue Forecast</h2>
              <p className="text-xs text-outline">Expected revenue by close month (open deals)</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="w-3 h-3 rounded-full bg-primary-container inline-block"></span> Forecast
            </div>
          </div>
          <div className="h-72">
            {revenueData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-outline text-sm">No forecast data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#dee3e9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6e7881', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6e7881', fontSize: 12 }} />
                  <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                  <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
          <h2 className="text-base font-semibold text-on-surface mb-4">Immediate Actions</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-error-container/40 rounded-lg border border-error-container">
              <AlertTriangle className="h-5 w-5 text-error mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-on-error-container">SLA Breach Warning</p>
                <p className="text-xs text-on-surface-variant mt-1">{slaBreached} tickets require urgent attention.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-primary-container/10 rounded-lg border border-primary-container/30">
              <TrendingUp className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-on-surface">Pipeline Forecast</p>
                <p className="text-xs text-on-surface-variant mt-1">Weighted forecast ${Number(forecastValue).toLocaleString()} across open deals.</p>
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-1 px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">
              View All Alerts <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Funnel + channels + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
          <h2 className="text-base font-semibold text-on-surface mb-4">Sales Funnel by Stage</h2>
          <div className="h-60">
            {funnelData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-outline text-sm">No deals yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#dee3e9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6e7881', fontSize: 12 }} />
                  <YAxis type="category" dataKey="stage" axisLine={false} tickLine={false} width={80} tick={{ fill: '#3e4850', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
          <h2 className="text-base font-semibold text-on-surface mb-4">Channel Distribution</h2>
          <div className="h-60">
            {channelData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-outline text-sm">No messages yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                    {channelData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {channelData.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></span>
                {c.name}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm">
          <h2 className="text-base font-semibold text-on-surface mb-4">Recent Activity</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-outline">No recent activity.</p>
          ) : (
            <ul className="space-y-4">
              {recent.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="h-8 w-8 rounded-full bg-primary-container/15 flex items-center justify-center flex-shrink-0">
                    <ActivityIcon className="h-4 w-4 text-primary-600" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-on-surface truncate">
                      <span className="capitalize font-medium">{item.type}</span>: {item.subject}
                    </p>
                    <p className="text-xs text-outline">{item.outcome || 'pending'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
