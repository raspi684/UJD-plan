import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { sentryConfig } from './config';

@Module({
  imports: [
    SentryModule.forRoot(sentryConfig),
    HttpModule,
    CacheModule.register(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
