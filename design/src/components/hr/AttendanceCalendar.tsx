import React, { useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CalendarDaysIcon,
  XIcon,
  TrendingUpIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  MinusCircleIcon,
  PalmtreeIcon,
} from 'lucide-react';
import { Panel } from '../ui/Panel';
import { Badge } from '../ui/StatusBadge';
import { cn } from '../../utils/cn';
import {
  getAttendanceForEmployee,
  getAttendanceSummary,
  type AttendanceRecord,
  type AttendanceStatus,
  type AttendanceSummary,
} from '../../data/attendance';

interface AttendanceCalendarProps {
  employeeId: string;
  employeeName?: string;
  initialYear?: number;
  initialMonth?: number;
  showSummary?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; bg: string; text: string; border: string; dot: string; icon?: React.ComponentType<any> }
> = {
  present: {
    label: 'Present',
    bg: 'bg-subtle',
    text: 'text-ink',
    border: 'border-line',
    dot: 'bg-success',
  },
  late: {
    label: 'Late',
    bg: 'bg-subtle',
    text: 'text-ink',
    border: 'border-line',
    dot: 'bg-warning',
  },
  absent: {
    label: 'Absent',
    bg: 'bg-subtle',
    text: 'text-ink',
    border: 'border-line',
    dot: 'bg-danger',
  },
  'on-leave': {
    label: 'On Leave',
    bg: 'bg-subtle',
    text: 'text-ink',
    border: 'border-line',
    dot: 'bg-muted',
  },
  'half-day': {
    label: 'Half Day',
    bg: 'bg-subtle',
    text: 'text-ink',
    border: 'border-line',
    dot: 'bg-faint',
  },
  weekend: {
    label: 'Weekend',
    bg: 'bg-canvas',
    text: 'text-faint',
    border: 'border-line/50',
    dot: 'bg-gray-300',
  },
  holiday: {
    label: 'Holiday',
    bg: 'bg-indigo-500/8',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/30',
    dot: 'bg-indigo-500',
  },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Bangladesh workweek: Sun–Thu working, Fri–Sat weekend
const DAY_HEADERS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function getFirstDayOffset(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  // Map to our Sat-start grid: Sat=0, Sun=1, Mon=2 ... Fri=6
  return firstDay === 6 ? 0 : firstDay + 1;
}

export function AttendanceCalendar({
  employeeId,
  employeeName,
  initialYear = 2026,
  initialMonth = 9,
  showSummary = true,
  compact = false,
}: AttendanceCalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<AttendanceRecord | null>(null);

  const records = getAttendanceForEmployee(employeeId, year, month);
  const summary = getAttendanceSummary(employeeId, year, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = getFirstDayOffset(year, month);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDay(null);
  };

  const isCurrentMonth = year === 2026 && month === 9;
  const canGoNext = !(year === 2026 && month === 9);

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-canvas text-muted">
            <CalendarDaysIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">
              {employeeName ? `${employeeName}'s Attendance` : 'My Attendance'}
            </h3>
            <p className="text-2xs text-muted">
              {MONTH_NAMES[month - 1]} {year} · Day-wise attendance register
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-canvas text-muted hover:text-ink hover:bg-surface transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="min-w-[120px] text-center text-xs font-semibold text-ink">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-canvas text-muted hover:text-ink hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next month"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-3 text-2xs">
        {(['present', 'late', 'absent', 'on-leave', 'half-day', 'holiday', 'weekend'] as AttendanceStatus[]).map(
          (s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', STATUS_CONFIG[s].dot)} />
              <span className="text-muted">{STATUS_CONFIG[s].label}</span>
            </span>
          )
        )}
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-line overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-canvas border-b border-line">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className={cn(
                'py-2 text-center text-2xs font-semibold uppercase tracking-wider',
                d === 'Fri' || d === 'Sat' ? 'text-faint' : 'text-muted'
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7">
          {/* Empty offset cells */}
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} className="border-b border-r border-line/50 bg-canvas/50 min-h-[52px]" />
          ))}

          {/* Actual day cells */}
          {records.map((rec) => {
            const cfg = STATUS_CONFIG[rec.status];
            const isSelected = selectedDay?.day === rec.day;
            const isToday = isCurrentMonth && rec.day === 21;

            return (
              <button
                key={rec.day}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : rec)}
                className={cn(
                  'relative border-b border-r border-line/50 p-1.5 text-left transition-all duration-100 hover:z-10',
                  compact ? 'min-h-[44px]' : 'min-h-[52px]',
                  cfg.bg,
                  isSelected
                    ? `ring-2 ring-accent ring-inset z-10 ${cfg.bg}`
                    : 'hover:brightness-95',
                  isToday && 'ring-1 ring-accent/50 ring-inset'
                )}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full text-2xs font-semibold',
                      isToday ? 'bg-accent text-white' : cfg.text
                    )}
                  >
                    {rec.day}
                  </span>
                  {rec.checkIn && (
                    <span className="font-mono text-2xs text-muted leading-tight">{rec.checkIn}</span>
                  )}
                </div>
                {!compact && (
                  <p className={cn('mt-0.5 text-2xs font-medium truncate', cfg.text)}>
                    {cfg.label}
                  </p>
                )}
              </button>
            );
          })}

          {/* Trailing empty cells */}
          {(() => {
            const totalCells = offset + daysInMonth;
            const remainder = totalCells % 7;
            if (remainder === 0) return null;
            return Array.from({ length: 7 - remainder }).map((_, i) => (
              <div key={`trail-${i}`} className="border-b border-r border-line/50 bg-canvas/50 min-h-[52px]" />
            ));
          })()}
        </div>
      </div>

      {/* Selected Day Detail Popup */}
      {selectedDay && (
        <div className="rounded-xl border border-accent/30 bg-accent-soft/30 p-4 animate-in fade-in duration-150">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold',
                  STATUS_CONFIG[selectedDay.status].bg,
                  STATUS_CONFIG[selectedDay.status].text,
                  'border',
                  STATUS_CONFIG[selectedDay.status].border
                )}
              >
                {selectedDay.day}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  {selectedDay.day} {MONTH_NAMES[month - 1]} {year}
                </p>
                <Badge tone={
                  selectedDay.status === 'present' ? 'success' :
                  selectedDay.status === 'late' ? 'warning' :
                  selectedDay.status === 'absent' ? 'danger' :
                  selectedDay.status === 'on-leave' ? 'info' :
                  'neutral'
                }>
                  {STATUS_CONFIG[selectedDay.status].label}
                </Badge>
              </div>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="rounded p-1 text-muted hover:text-ink hover:bg-canvas transition-colors"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {selectedDay.checkIn && (
              <div className="rounded-lg border border-line bg-surface p-2.5">
                <span className="block text-2xs font-semibold uppercase text-muted">Check-In</span>
                <span className="block font-mono text-sm font-semibold text-ink mt-0.5">{selectedDay.checkIn}</span>
              </div>
            )}
            {selectedDay.checkOut && (
              <div className="rounded-lg border border-line bg-surface p-2.5">
                <span className="block text-2xs font-semibold uppercase text-muted">Check-Out</span>
                <span className="block font-mono text-sm font-semibold text-ink mt-0.5">{selectedDay.checkOut}</span>
              </div>
            )}
            {selectedDay.workingHours != null && (
              <div className="rounded-lg border border-line bg-surface p-2.5">
                <span className="block text-2xs font-semibold uppercase text-muted">Working Hours</span>
                <span className="block font-mono text-sm font-semibold text-ink mt-0.5">{selectedDay.workingHours}h</span>
              </div>
            )}
            {selectedDay.overtime != null && selectedDay.overtime > 0 && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                <span className="block text-2xs font-semibold uppercase text-emerald-600">Overtime</span>
                <span className="block font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  +{selectedDay.overtime}h
                </span>
              </div>
            )}
          </div>

          {selectedDay.note && (
            <p className="mt-2.5 text-xs text-muted">
              <strong className="text-ink">Note:</strong> {selectedDay.note}
            </p>
          )}
        </div>
      )}

      {/* Monthly Summary Strip */}
      {showSummary && (
        <div className="rounded-xl border border-line bg-canvas p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUpIcon className="h-4 w-4 text-muted" />
            <span className="text-xs font-semibold text-ink">Monthly Summary</span>
            <span className="text-2xs text-muted">· {MONTH_NAMES[month - 1]} {year}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
            {[
              { label: 'Present', value: summary.present, color: 'text-ink', bg: 'bg-subtle' },
              { label: 'Late', value: summary.late, color: 'text-ink', bg: 'bg-subtle' },
              { label: 'Absent', value: summary.absent, color: 'text-ink', bg: 'bg-subtle' },
              { label: 'On Leave', value: summary.onLeave, color: 'text-ink', bg: 'bg-subtle' },
              { label: 'Half Day', value: summary.halfDay, color: 'text-ink', bg: 'bg-subtle' },
              { label: 'Holidays', value: summary.holidays, color: 'text-muted', bg: 'bg-subtle' },
              { label: 'Weekends', value: summary.weekends, color: 'text-faint', bg: 'bg-canvas' },
              { label: 'Work Days', value: summary.totalWorkingDays, color: 'text-ink', bg: 'bg-surface' },
              { label: 'Avg Check-In', value: summary.averageCheckIn, color: 'text-ink', bg: 'bg-surface', mono: true },
            ].map((item) => (
              <div key={item.label} className={cn('rounded-lg border border-line p-2 text-center', item.bg)}>
                <p className={cn('font-mono text-base font-bold', item.color, item.mono && 'text-sm')}>
                  {item.value}
                </p>
                <p className="text-2xs text-muted mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
