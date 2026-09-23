import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PlatformModule } from './modules/platform/platform.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { IamModule } from './modules/iam/iam.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    PlatformModule,
    AuditModule,
    AuthModule,
    OrganizationsModule,
    IamModule,
    FinanceModule,
    ProcurementModule,
    InventoryModule,
    WorkflowsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
