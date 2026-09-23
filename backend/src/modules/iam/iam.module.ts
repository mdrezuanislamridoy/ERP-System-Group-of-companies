import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IamService } from './iam.service';
import { IamController } from './iam.controller';

@Module({
  imports: [JwtModule],
  controllers: [IamController],
  providers: [IamService],
  exports: [IamService],
})
export class IamModule {}
