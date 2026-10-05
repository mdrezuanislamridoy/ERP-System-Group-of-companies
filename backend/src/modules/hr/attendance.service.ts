import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AbacPolicyService } from '../auth/services/abac-policy.service';
import { RequestContext } from '../../common/interfaces/request-context.interface';

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abacPolicy: AbacPolicyService,
  ) {}

  async clockIn(ctx: RequestContext) {
    if (!ctx.user) throw new BadRequestException('Authentication context required.');
    const personId = ctx.user.personId;
    const companyId = ctx.scope?.activeCompanyId;
    if (!companyId) {
      throw new BadRequestException('An active company context is required to clock in.');
    }

    const today = startOfDay();
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { personId_date: { personId, date: today } },
    });
    if (existing?.checkInAt) {
      throw new BadRequestException('You have already checked in today.');
    }

    const now = new Date();
    // 09:15 is the grace cutoff for an on-time arrival.
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);

    return this.prisma.attendanceRecord.upsert({
      where: { personId_date: { personId, date: today } },
      create: { personId, companyId, date: today, checkInAt: now, status: isLate ? 'LATE' : 'PRESENT' },
      update: { checkInAt: now, status: isLate ? 'LATE' : 'PRESENT' },
    });
  }

  async clockOut(ctx: RequestContext) {
    if (!ctx.user) throw new BadRequestException('Authentication context required.');
    const personId = ctx.user.personId;
    const today = startOfDay();

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { personId_date: { personId, date: today } },
    });
    if (!existing?.checkInAt) {
      throw new BadRequestException('You have not checked in today.');
    }
    if (existing.checkOutAt) {
      throw new BadRequestException('You have already checked out today.');
    }

    const now = new Date();
    const workingHours = (now.getTime() - existing.checkInAt.getTime()) / 3_600_000;

    return this.prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkOutAt: now, workingHours: Math.round(workingHours * 100) / 100 },
    });
  }

  async getMyAttendance(ctx: RequestContext, year: number, month: number) {
    if (!ctx.user) throw new BadRequestException('Authentication context required.');
    return this.getAttendanceForPerson(ctx.user.personId, year, month);
  }

  async getAttendanceForPerson(personId: string, year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { personId, date: { gte: from, lt: to } },
      orderBy: { date: 'asc' },
    });

    const present = records.filter((r) => r.status === 'PRESENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const onLeave = records.filter((r) => r.status === 'ON_LEAVE').length;
    const halfDay = records.filter((r) => r.status === 'HALF_DAY').length;

    return {
      records,
      summary: {
        present,
        late,
        absent,
        onLeave,
        halfDay,
        totalWorkingDays: present + late + halfDay,
      },
    };
  }

  /** HR/manager view of another employee's attendance — gated by company scope, not just permission. */
  async getAttendanceForEmployee(ctx: RequestContext, personId: string, year: number, month: number) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: { user: { include: { assignments: true } } },
    });
    if (!person) throw new NotFoundException('Employee not found.');

    const employeeCompanyId = person.user?.assignments.find((a) => a.companyId)?.companyId;
    if (ctx.scope && employeeCompanyId) {
      this.abacPolicy.assertCompanyScope(ctx.scope, employeeCompanyId, 'view attendance for employees in');
    }

    return this.getAttendanceForPerson(personId, year, month);
  }
}
