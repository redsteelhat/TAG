import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import {
  assertSecurityConfiguration,
  buildCorsOptions,
  configureExpressSecurity,
  isSwaggerEnabled
} from './common/security/security';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false
  });
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const port = configService.get<number>('PORT', 3001);

  assertSecurityConfiguration(configService);
  configureExpressSecurity(app, configService);
  app.setGlobalPrefix(apiPrefix);
  app.enableCors(buildCorsOptions(configService));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  if (isSwaggerEnabled(configService)) {
    setupSwagger(app);
  }

  await app.listen(port);
}

void bootstrap();
