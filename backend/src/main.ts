import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. ตั้งค่า Prefix ให้ทุก API เริ่มต้นด้วย /api
  app.setGlobalPrefix('api');

  // 2. เปิดให้ Frontend เรียก API ได้
  app.enableCors();

  // 3. ตั้งค่า ValidationPipe ตรวจสอบ DTO ทั่วทั้งแอป
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 4. ตั้งค่า Global Exception Filter ดักจับ Error ทั่วระบบ
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 QueueReg Backend is running on: http://localhost:${port}/api`);
}
bootstrap();
