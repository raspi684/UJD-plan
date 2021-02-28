import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import path from 'path';

async function bootstrap() {
  if (!fs.existsSync(path.resolve(__dirname, '../pdfs')))
    fs.mkdirSync(path.resolve(__dirname, '../pdfs'));
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(3000);
}
bootstrap();
