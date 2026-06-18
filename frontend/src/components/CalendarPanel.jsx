import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import { activityService } from '../services/api';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function CalendarPanel({ user, onClose }) {
  const navigate = useNavigate();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [activities, setActivities] = useState([]);

  const isManager = user.role === 'supervisor' || user.role === 'admin';
  const myId = user.user_id || user.id;

  useEffect(() => {
    activityService.list()
      .then((r) => {
        const mine = r.data.filter((a) => a.due_at && (isManager || a.owner_user_id === myId));
        setActivities(mine.map((a) => ({ ...a, _date: new Date(a.due_at) })));
      })
      .catch(() => setActivities([]));
  }, []);

  // Build the 6x7 grid of dates for the visible month.
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay()); // back up to Sunday
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const dayActivities = (d) => activities.filter((a) => sameDay(a._date, d));
  const selectedActs = dayActivities(selected).sort((a, b) => a._date - b._date);

  const go = (to) => { onClose(); navigate(to); };
  const monthLabel = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container-low">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-on-surface-variant" />
          <h3 className="text-sm font-semibold text-on-surface">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-1 rounded-md hover:bg-surface-container-high text-on-surface-variant"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-1 rounded-md hover:bg-surface-container-high text-on-surface-variant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-outline uppercase py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const isSelected = sameDay(d, selected);
            const has = dayActivities(d).length > 0;
            return (
              <button
                key={i}
                onClick={() => setSelected(new Date(d))}
                className={`relative h-9 rounded-lg text-xs flex items-center justify-center transition-colors
                  ${isSelected ? 'bg-primary-container text-on-primary font-bold'
                    : isToday ? 'bg-primary-100 text-primary-700 font-bold'
                    : inMonth ? 'text-on-surface hover:bg-surface-container-high'
                    : 'text-outline-variant hover:bg-surface-container-high'}`}
              >
                {d.getDate()}
                {has && (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-on-primary' : 'bg-primary-container'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-outline-variant px-4 py-3 max-h-44 overflow-y-auto">
        <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
          {selected.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
        {selectedActs.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-2">No tasks or meetings scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {selectedActs.map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${a.outcome || a.completed_at ? 'bg-outline' : 'bg-primary-container'}`} />
                <div className="min-w-0">
                  <p className="text-sm text-on-surface truncate">{a.subject || a.type}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {a._date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {a.type}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => go('/activities')}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-700 hover:bg-surface-container-low border-t border-outline-variant transition-colors"
      >
        <Plus className="h-4 w-4" /> Open Activities
      </button>
    </div>
  );
}
