import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [HttpModule, CacheModule.register({ ttl: 60 * 60 * 2 })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
