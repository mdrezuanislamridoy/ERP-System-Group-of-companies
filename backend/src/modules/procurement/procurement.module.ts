import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';

@Module({
  imports: [JwtModule],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
