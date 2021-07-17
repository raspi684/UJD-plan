import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('/api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/groups')
  getGroups() {
    return this.appService.getGroups();
  }

  @Get('/groups/:filename')
  getTimetable(@Param('filename') filename: string) {
    return this.appService.getTimetable(filename);
  }
}
