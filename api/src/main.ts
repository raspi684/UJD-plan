import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SentryInterceptor } from '@ntegral/nestjs-sentry';
import { HttpException } from '@nestjs/common';
import { appConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalInterceptors(
    new SentryInterceptor({
      filters: [
        {
          type: HttpException,
          filter: (exception: HttpException) => 499 > exception.getStatus(),
        },
      ],
    }),
  );
  await app.listen(appConfig.port);
}
bootstrap();
