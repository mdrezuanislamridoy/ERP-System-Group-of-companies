import React from 'react';
import { cn } from '../utils/cn';

interface ActivityGroup {
  day: string;
  items: Array<{time: string;text: string;tone: 'info' | 'success' | 'warning' | 'danger';}>;
}

const DOT = {
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger'
};

export function ActivityTimeline({ groups }: {groups: ActivityGroup[];}) {
  return (
    <div className="space-y-4">
      {groups.map((g) =>
      <div key={g.day}>
          <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">{g.day}</p>
          <ul className="space-y-2.5">
            {g.items.map((item) =>
          <li key={item.time + item.text} className="flex gap-3">
                <span className="w-9 shrink-0 font-mono tabular text-sm text-faint">{item.time}</span>
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', DOT[item.tone])} aria-hidden />
                <span className="text-base text-muted">{item.text}</span>
              </li>
          )}
          </ul>
        </div>
      )}
    </div>);

}