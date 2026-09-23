import type { Employee } from '../types';
import { employees } from './people';

// ─── Attendance Types ────────────────────────────────────────────────────────

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'on-leave'
  | 'half-day'
  | 'weekend'
  | 'holiday';

export interface AttendanceRecord {
  employeeId: string;
  date: string; // ISO date string YYYY-MM-DD
  day: number;  // 1–30/31
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  workingHours?: number;
  overtime?: number;
  note?: string;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  halfDay: number;
  holidays: number;
  weekends: number;
  totalWorkingDays: number;
  totalHoursWorked: number;
  averageCheckIn: string;
}

// ─── Bangladesh Public Holidays (September 2026) ─────────────────────────────

const BD_HOLIDAYS_SEP_2026: Record<number, string> = {
  17: 'National Mourning Day (Observed)',
};

// ─── Deterministic Attendance Seed Generator ─────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateCheckIn(rng: () => number, isLate: boolean): string {
  if (isLate) {
    const mins = 10 + Math.floor(rng() * 50); // 10–59 min late
    const h = 9 + Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const h = 7 + Math.floor(rng() * 2); // 07:xx or 08:xx
  const m = Math.floor(rng() * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateCheckOut(rng: () => number, checkIn: string, hasOvertime: boolean): string {
  const [ch, cm] = checkIn.split(':').map(Number);
  const baseHours = 8 + (hasOvertime ? 1 + Math.floor(rng() * 3) : 0);
  const extraMins = Math.floor(rng() * 30);
  let outH = ch + baseHours;
  let outM = cm + extraMins;
  if (outM >= 60) {
    outH += 1;
    outM -= 60;
  }
  return `${String(Math.min(outH, 23)).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
}

function calcWorkingHours(checkIn: string, checkOut: string): number {
  const [ih, im] = checkIn.split(':').map(Number);
  const [oh, om] = checkOut.split(':').map(Number);
  const diff = (oh * 60 + om) - (ih * 60 + im);
  return Math.round((diff / 60) * 10) / 10;
}

function generateEmployeeMonth(
  employeeId: string,
  year: number,
  month: number
): AttendanceRecord[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const seed = employeeId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + year * 100 + month;
  const rng = seededRandom(seed);
  const records: AttendanceRecord[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Friday (5) is the weekend in BD
    if (dayOfWeek === 5) {
      records.push({ employeeId, date: isoDate, day, status: 'weekend', note: 'Friday — Weekly Rest Day' });
      continue;
    }

    // Saturday (6) is often half-day or off depending on sector
    if (dayOfWeek === 6) {
      records.push({ employeeId, date: isoDate, day, status: 'weekend', note: 'Saturday — Weekend' });
      continue;
    }

    // Public holidays
    if (BD_HOLIDAYS_SEP_2026[day] && month === 9 && year === 2026) {
      records.push({ employeeId, date: isoDate, day, status: 'holiday', note: BD_HOLIDAYS_SEP_2026[day] });
      continue;
    }

    // Future days in current month (after 21 Sep 2026)
    if (year === 2026 && month === 9 && day > 21) {
      records.push({ employeeId, date: isoDate, day, status: 'weekend', note: 'Upcoming' });
      continue;
    }

    const roll = rng();

    // ~5% absent
    if (roll < 0.05) {
      records.push({
        employeeId,
        date: isoDate,
        day,
        status: 'absent',
        note: 'No check-in recorded',
      });
      continue;
    }

    // ~8% on-leave
    if (roll < 0.13) {
      const leaveTypes = ['Annual Leave', 'Sick Leave', 'Casual Leave', 'Personal Leave'];
      records.push({
        employeeId,
        date: isoDate,
        day,
        status: 'on-leave',
        note: leaveTypes[Math.floor(rng() * leaveTypes.length)],
      });
      continue;
    }

    // ~4% half-day
    if (roll < 0.17) {
      const ci = generateCheckIn(rng, false);
      const co = `${String(Number(ci.split(':')[0]) + 4).padStart(2, '0')}:${ci.split(':')[1]}`;
      records.push({
        employeeId,
        date: isoDate,
        day,
        status: 'half-day',
        checkIn: ci,
        checkOut: co,
        workingHours: 4,
        note: 'Half-day (approved)',
      });
      continue;
    }

    // ~12% late
    const isLate = roll < 0.29;
    const hasOvertime = rng() < 0.2;
    const ci = generateCheckIn(rng, isLate);
    const co = generateCheckOut(rng, ci, hasOvertime);
    const wh = calcWorkingHours(ci, co);
    const ot = hasOvertime ? Math.round((wh - 8) * 10) / 10 : 0;

    records.push({
      employeeId,
      date: isoDate,
      day,
      status: isLate ? 'late' : 'present',
      checkIn: ci,
      checkOut: co,
      workingHours: wh,
      overtime: ot > 0 ? ot : undefined,
      note: isLate
        ? `Late arrival (${Math.round((Number(ci.split(':')[0]) * 60 + Number(ci.split(':')[1]) - 540))} min)`
        : hasOvertime
          ? `Overtime: ${ot}h`
          : undefined,
    });
  }

  return records;
}

// ─── Cached Data Store ───────────────────────────────────────────────────────

const attendanceCache: Record<string, AttendanceRecord[]> = {};

function getCacheKey(employeeId: string, year: number, month: number): string {
  return `${employeeId}:${year}:${month}`;
}

/**
 * Returns day-wise attendance records for a specific employee & month.
 */
export function getAttendanceForEmployee(
  employeeId: string,
  year: number = 2026,
  month: number = 9
): AttendanceRecord[] {
  const key = getCacheKey(employeeId, year, month);
  if (!attendanceCache[key]) {
    attendanceCache[key] = generateEmployeeMonth(employeeId, year, month);
  }
  return attendanceCache[key];
}

/**
 * Returns aggregate summary stats for an employee's month.
 */
export function getAttendanceSummary(
  employeeId: string,
  year: number = 2026,
  month: number = 9
): AttendanceSummary {
  const records = getAttendanceForEmployee(employeeId, year, month);

  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const onLeave = records.filter((r) => r.status === 'on-leave').length;
  const halfDay = records.filter((r) => r.status === 'half-day').length;
  const holidays = records.filter((r) => r.status === 'holiday').length;
  const weekends = records.filter((r) => r.status === 'weekend').length;
  const totalWorkingDays = present + late + halfDay;

  const workedRecords = records.filter((r) => r.workingHours != null);
  const totalHoursWorked = Math.round(
    workedRecords.reduce((s, r) => s + (r.workingHours ?? 0), 0) * 10
  ) / 10;

  const checkIns = records
    .filter((r) => r.checkIn)
    .map((r) => {
      const [h, m] = r.checkIn!.split(':').map(Number);
      return h * 60 + m;
    });
  const avgCheckInMins =
    checkIns.length > 0 ? Math.round(checkIns.reduce((a, b) => a + b, 0) / checkIns.length) : 0;
  const avgH = Math.floor(avgCheckInMins / 60);
  const avgM = avgCheckInMins % 60;
  const averageCheckIn = `${String(avgH).padStart(2, '0')}:${String(avgM).padStart(2, '0')}`;

  return {
    present,
    late,
    absent,
    onLeave,
    halfDay,
    holidays,
    weekends,
    totalWorkingDays,
    totalHoursWorked,
    averageCheckIn,
  };
}

/**
 * Resolves the current user's employee record and returns their attendance.
 */
export function getMyAttendance(
  userEmployeeId: string,
  year: number = 2026,
  month: number = 9
): { records: AttendanceRecord[]; summary: AttendanceSummary; employee: Employee | undefined } {
  const employee = employees.find((e) => e.id === userEmployeeId);
  const records = getAttendanceForEmployee(userEmployeeId, year, month);
  const summary = getAttendanceSummary(userEmployeeId, year, month);
  return { records, summary, employee };
}

/**
 * Returns all employees that a user can view attendance for.
 * - If `canReadGroup`: all employees
 * - If `canReadEmployees`: employees in the same company
 * - Otherwise: only themselves
 */
export function getViewableEmployees(
  currentEmployeeId: string,
  currentCompany: string,
  canReadEmployees: boolean,
  canReadGroup: boolean
): Employee[] {
  if (canReadGroup) return employees;
  if (canReadEmployees) return employees.filter((e) => e.company === currentCompany);
  const self = employees.find((e) => e.id === currentEmployeeId);
  return self ? [self] : [];
}
