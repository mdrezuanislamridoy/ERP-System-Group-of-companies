import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      console.warn('⚠️ Prisma could not connect to PostgreSQL immediately (normal if DB container is starting or offline).');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
