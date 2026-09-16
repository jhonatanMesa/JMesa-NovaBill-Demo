import 'reflect-metadata';
import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  HttpException,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiOperation, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AuthModule } from './auth/auth.controller';
import { CatalogModule } from './catalog/catalog.controller';
import { BillingModule } from './billing/billing.controller';
import { db } from './database';
import { rateLimit, secret } from './security';
@Catch()
class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    let status = 500;
    let message: unknown = 'Error interno. Inténtalo nuevamente.';
    if (error instanceof HttpException) {
      status = error.getStatus();
      const body = error.getResponse();
      message = typeof body === 'string' ? body : (body as { message?: unknown }).message;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        status = 409;
        message = 'Ya existe un registro con estos datos';
      } else if (error.code === 'P2025') {
        status = 404;
        message = 'Registro no encontrado';
      } else if (error.code === 'P2003') {
        status = 400;
        message = 'Relación no válida';
      }
    }
    if (status === 500)
      console.error('API failure', error instanceof Error ? error.name : 'UnknownError');
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
@Controller('health')
class HealthController {
  @Get() @ApiOperation({ summary: 'Disponibilidad de API y PostgreSQL' }) async health() {
    await db.$queryRaw`SELECT 1`;
    return { status: 'ok', mode: 'demo' };
  }
}
@Module({ imports: [AuthModule, CatalogModule, BillingModule], controllers: [HealthController] })
class AppModule {}
export async function createApp() {
  secret();
  if (!process.env.APP_ORIGIN) throw new Error('APP_ORIGIN es obligatorio');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.APP_ORIGIN,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Novabill-Request'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.use(rateLimit);
  app.useGlobalFilters(new ErrorFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  const config = new DocumentBuilder()
    .setTitle('NovaBill Demo API')
    .setVersion('1.0.0')
    .setDescription(
      'Demo comercial. No constituye facturación electrónica válida ante la DIAN. Para mutaciones: Origin igual a APP_ORIGIN y X-Novabill-Request: 1. Roles y reglas descritos en cada operación. Errores JSON: {statusCode, message}; 400 validación, 401 sesión, 403 rol/origen, 404 recurso, 409 duplicado, 429 límite.',
    )
    .addCookieAuth('nb_access')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      requestInterceptor: (req: { method: string; headers: Record<string, string> }) => {
        req.headers['X-Novabill-Request'] = '1';
        return req;
      },
    },
  });
  await app.init();
  return app;
}
