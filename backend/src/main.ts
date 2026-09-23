import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('OkobizERP-Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global Middlewares & Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Global Interceptors & Filters
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS Configuration
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000', '*'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Organization-Id',
      'X-Correlation-Id',
      'Idempotency-Key',
      'If-Match',
    ],
  });

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Okobiz Group Multi-Company ERP API')
    .setDescription(
      'Enterprise Backend Specification for Okobiz Group Holdings PLC. Features multi-level organizational ABAC scoping, double-entry financial ledger, procurement workflows, and cryptographically verified audit trails.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT Authorization',
        description: 'Enter JWT access token with Bearer prefix',
        in: 'header',
      },
      'bearer',
    )
    .addTag('Authentication', 'Authentication, session management, and context switching')
    .addTag('Organizations', 'Multi-level corporate hierarchy and sister concern management')
    .addTag('Identity & Access Management (IAM)', 'User directory, RBAC roles, and ABAC policies')
    .addTag('Finance', 'Double-entry general ledger, chart of accounts, and trial balances')
    .addTag('Procurement', 'Purchase requests and automated multi-stage approvals')
    .addTag('Inventory', 'Warehouse stocks, valuations, and movement ledgers')
    .addTag('Approvals & Workflows', 'Unified approval inbox and workflow transitions')
    .addTag('Audit', 'Cryptographically chained SHA-256 tamper-evident audit logs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 Okobiz ERP Backend running at: http://localhost:${port}`);
  logger.log(`📖 Swagger API Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
