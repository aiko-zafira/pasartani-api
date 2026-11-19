import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js'
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exeption.filter.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new TypeOrmExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Pasartani Digital Supply Chain API')
    .setDescription(
      'REST API Aplikasi Pasar Tani Digital: Harga Pasar, Lahan, Smart Crop Planner, & Hasil Panen',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Pasartani API berjalan di http://localhost:${port}/api`);
  console.log(`Swagger Docs tersedia di http://localhost:${port}/docs`);
}
bootstrap();
