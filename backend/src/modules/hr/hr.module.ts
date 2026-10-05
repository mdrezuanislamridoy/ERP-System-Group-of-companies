import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HrController } from './hr.controller';
import { AttendanceService } from './attendance.service';
import { PayrollService } from './payroll.service';

@Module({
  imports: [JwtModule],
  controllers: [HrController],
  providers: [AttendanceService, PayrollService],
  exports: [AttendanceService, PayrollService],
})
export class HrModule {}
