import { useState } from 'react';
import {
  X, LifeBuoy, Rocket, Sparkles, Shield, UserCog, User,
  LayoutDashboard, UserPlus, Users, GitBranch, Briefcase, FileText,
  Package, Megaphone, Calendar, Ticket, Receipt, BarChart3, Network,
  Zap, Settings, CheckCircle, Lightbulb,
} from 'lucide-react';

// Role presentation metadata.
const ROLE_META = {
  admin: {
    icon: Shield,
    label: 'Administrator',
    blurb: 'Full control of the platform — configuration, users, integrations, and all business data.',
  },
  supervisor: {
    icon: UserCog,
    label: 'Supervisor',
    blurb: 'Lead your team — oversee the pipeline, approve deals, and track performance across agents.',
  },
  agent: {
    icon: User,
    label: 'Sales Agent',
    blurb: 'Work your book of business — manage leads, contacts, deals, activities, and support tickets.',
  },
};

// Step-by-step quick start per role.
const QUICK_START = {
  agent: [
    'Open the Dashboard to see your assigned work and today\'s priorities.',
    'Add or qualify Leads, then convert promising ones into Contacts.',
    'Create Deals and move them through the Pipeline as they progress.',
    'Log every Call, Meeting, and Task under Activities so nothing slips.',
    'Resolve customer issues from the Tickets queue within SLA.',
  ],
  supervisor: [
    'Review the Dashboard for team-wide pipeline and revenue health.',
    'Use Team Management to monitor each agent\'s workload and quota.',
    'Clear pending requests from Approvals so deals keep moving.',
    'Send and track Campaigns, then read results under Reports.',
    'Manage Quotes and Products that your agents sell.',
  ],
  admin: [
    'Create real user accounts under User Management and assign roles.',
    'Configure System Settings (company, tax, SLA, email/SMTP).',
    'Connect external tools (Slack, Stripe, Mailchimp) in Connectors.',
    'Automate routine work with Workflows.',
    'Everything supervisors and agents can do is also available to you.',
  ],
};

// Feature catalogue. `roles` controls who sees each card.
const FEATURES = [
  { icon: LayoutDashboard, name: 'Dashboard', roles: ['admin', 'supervisor', 'agent'], desc: 'Your home base — key metrics, charts, and what needs attention today.' },
  { icon: UserPlus, name: 'Leads', roles: ['admin', 'supervisor', 'agent'], desc: 'Capture early-stage prospects with automatic lead scoring to prioritise outreach.' },
  { icon: Users, name: 'Contacts', roles: ['admin', 'supervisor', 'agent'], desc: 'Your relationship records. Import in bulk via CSV and track full timelines.' },
  { icon: GitBranch, name: 'Pipeline', roles: ['admin', 'supervisor', 'agent'], desc: 'Kanban board of open deals by stage — drag work forward at a glance.' },
  { icon: Briefcase, name: 'Deals', roles: ['admin', 'supervisor', 'agent'], desc: 'Manage opportunities, amounts, and win probability through to close.' },
  { icon: FileText, name: 'Quotes', roles: ['admin', 'supervisor'], desc: 'Build line-item quotes, export to PDF, and convert won quotes to invoices.' },
  { icon: Package, name: 'Products', roles: ['admin', 'supervisor'], desc: 'Maintain your catalogue of products and pricing used across quotes.' },
  { icon: Megaphone, name: 'Campaigns', roles: ['admin', 'supervisor'], desc: 'Plan and send marketing campaigns, then measure channel performance.' },
  { icon: Calendar, name: 'Activities', roles: ['admin', 'supervisor', 'agent'], desc: 'Calls, meetings, and tasks. Use the calendar in the top bar to see what\'s due.' },
  { icon: Ticket, name: 'Tickets', roles: ['admin', 'supervisor', 'agent'], desc: 'Customer support queue with SLA tracking so responses stay on time.' },
  { icon: Receipt, name: 'Invoices', roles: ['admin', 'supervisor', 'agent'], desc: 'Generate, send, and download invoices as PDF; track payment status.' },
  { icon: BarChart3, name: 'Reports', roles: ['admin', 'supervisor'], desc: 'Forecasting, funnel analysis, channel analytics, and SLA reporting.' },
  { icon: CheckCircle, name: 'Approvals', roles: ['admin', 'supervisor'], desc: 'Review and decide on requests (e.g. discounts) raised by your agents.' },
  { icon: UserCog, name: 'Team Management', roles: ['admin', 'supervisor'], desc: 'See each agent\'s activity, quota attainment, and workload.' },
  { icon: Shield, name: 'User Management', roles: ['admin'], desc: 'Create users, set roles (Admin / Supervisor / Agent), and manage access.' },
  { icon: Network, name: 'Connectors', roles: ['admin'], desc: 'Integrate Slack, Stripe, Mailchimp & webhooks with secure API keys.' },
  { icon: Zap, name: 'Workflows', roles: ['admin'], desc: 'Automate repetitive steps with rule-based workflows.' },
  { icon: Settings, name: 'System Settings', roles: ['admin'], desc: 'Company profile, tax, SLA policies, email/SMTP, and backups.' },
];

const TIPS = [
  { icon: '🔔', text: 'The bell shows tasks, tickets, and approvals that need you. Click any item to jump straight to it.' },
  { icon: '📅', text: 'The calendar in the top bar plots your scheduled activities — pick a day to see what\'s on.' },
  { icon: '🔎', text: 'Use the search box in the top bar to quickly find what you need.' },
  { icon: '💾', text: 'Your data is backed up automatically every month; admins can also back up on demand.' },
];

export default function HelpModal({ user, onClose }) {
  const role = ROLE_META[user.role] ? user.role : 'agent';
  const meta = ROLE_META[role];
  const RoleIcon = meta.icon;
  const features = FEATURES.filter((f) => f.roles.includes(role));
  const [tab, setTab] = useState('start'); // 'start' | 'features' | 'tips'

  const TabBtn = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full transition-colors
        ${tab === id ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-6 bg-gradient-to-br from-primary-700 via-primary-600 to-secondary text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <LifeBuoy className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold leading-tight">Welcome to Apex CRM, {user.name.split(' ')[0]}</h2>
              <div className="flex items-center gap-2 mt-1 text-white/90 text-sm">
                <RoleIcon className="h-4 w-4" />
                <span className="font-semibold">{meta.label}</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-white/90 mt-3 max-w-2xl">{meta.blurb}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-outline-variant bg-surface-container-low">
          <TabBtn id="start" icon={Rocket} label="Quick Start" />
          <TabBtn id="features" icon={Sparkles} label="Your Features" />
          <TabBtn id="tips" icon={Lightbulb} label="Tips" />
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">
          {tab === 'start' && (
            <ol className="space-y-3">
              {QUICK_START[role].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 h-7 w-7 rounded-full bg-primary-container text-on-primary text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-sm text-on-surface pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
          )}

          {tab === 'features' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.name}
                    className="flex items-start gap-3 p-4 rounded-2xl border border-outline-variant bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    <span className="shrink-0 h-9 w-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface">{f.name}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'tips' && (
            <div className="space-y-3">
              {TIPS.map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant">
                  <span className="text-xl leading-none">{t.icon}</span>
                  <p className="text-sm text-on-surface pt-0.5">{t.text}</p>
                </div>
              ))}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-100 border border-primary-200">
                <Lightbulb className="h-5 w-5 text-primary-700 shrink-0" />
                <p className="text-sm text-primary-900">
                  Need a hand? Reach your administrator for account access, or revisit this guide
                  anytime from the <span className="font-semibold">help icon</span> in the top bar.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
