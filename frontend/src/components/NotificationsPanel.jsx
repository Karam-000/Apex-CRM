import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckSquare, Ticket, CheckCircle, AlertTriangle, Inbox,
} from 'lucide-react';
import { activityService, ticketService, approvalService } from '../services/api';

// Relative "time ago / due in" helper.
function relTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diffMs = d.getTime() - Date.now();
  const past = diffMs < 0;
  const mins = Math.round(Math.abs(diffMs) / 60000);
  const fmt = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  let label;
  if (mins < 60) label = fmt(mins, 'min');
  else if (mins < 1440) label = fmt(Math.round(mins / 60), 'hr');
  else label = fmt(Math.round(mins / 1440), 'day');
  return past ? `${label} ago` : `in ${label}`;
}

export default function NotificationsPanel({ user, onClose }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const isManager = user.role === 'supervisor' || user.role === 'admin';
  const myId = user.user_id || user.id;

  useEffect(() => {
    let active = true;
    (async () => {
      const notifs = [];
      // settle() runs a request but never throws (e.g. agent lacks approval access).
      const settle = (p) => p.then((r) => r.data).catch(() => []);

      const [activities, tickets, approvals] = await Promise.all([
        settle(activityService.list()),
        settle(ticketService.list()),
        isManager ? settle(approvalService.list()) : Promise.resolve([]),
      ]);

      // Open tasks assigned to me (or to anyone, for managers) that are due/overdue.
      activities
        .filter((a) => !a.outcome && !a.completed_at && a.due_at)
        .filter((a) => isManager || a.owner_user_id === myId)
        .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
        .slice(0, 6)
        .forEach((a) => {
          const overdue = new Date(a.due_at) < new Date();
          notifs.push({
            id: `act-${a.id}`,
            icon: overdue ? AlertTriangle : CheckSquare,
            tone: overdue ? 'error' : 'primary',
            title: a.subject || `${a.type} task`,
            meta: `${overdue ? 'Overdue' : 'Due'} ${relTime(a.due_at)}`,
            to: '/activities',
          });
        });

      // Open support tickets (mine, or all for managers).
      tickets
        .filter((t) => t.status !== 'resolved' && t.status !== 'closed')
        .filter((t) => isManager || t.assigned_user_id === myId)
        .slice(0, 6)
        .forEach((t) => {
          notifs.push({
            id: `tkt-${t.id}`,
            icon: Ticket,
            tone: t.priority === 'high' || t.priority === 'urgent' ? 'error' : 'tertiary',
            title: t.subject,
            meta: `${t.priority || 'medium'} priority · ${t.status}`,
            to: '/tickets',
          });
        });

      // Pending approvals waiting on this manager.
      approvals
        .filter((ap) => (ap.status || 'pending') === 'pending')
        .slice(0, 6)
        .forEach((ap) => {
          notifs.push({
            id: `apr-${ap.id}`,
            icon: CheckCircle,
            tone: 'secondary',
            title: ap.title || ap.entity_type || `Approval #${ap.id}`,
            meta: 'Awaiting your decision',
            to: '/supervisor/approvals',
          });
        });

      if (active) {
        setItems(notifs);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const toneClasses = {
    primary: 'bg-primary-100 text-primary-700',
    error: 'bg-error-container text-on-error-container',
    tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    secondary: 'bg-secondary-fixed text-on-secondary-fixed-variant',
  };

  const go = (to) => { onClose(); navigate(to); };

  return (
    <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container-low">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-on-surface-variant" />
          <h3 className="text-sm font-semibold text-on-surface">Notifications</h3>
        </div>
        {items.length > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-container text-on-primary">
            {items.length}
          </span>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-on-surface-variant">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Inbox className="h-8 w-8 mx-auto text-outline mb-2" />
            <p className="text-sm font-medium text-on-surface">You're all caught up</p>
            <p className="text-xs text-on-surface-variant mt-1">No tasks, tickets, or approvals need attention.</p>
          </div>
        ) : (
          items.map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                onClick={() => go(n.to)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-container-low transition-colors border-b border-outline-variant/50 last:border-0"
              >
                <span className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${toneClasses[n.tone]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-on-surface truncate">{n.title}</span>
                  <span className="block text-xs text-on-surface-variant">{n.meta}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
