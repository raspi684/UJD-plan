import { Controller, Get, Param, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('/api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/groups')
  async getGroups(): Promise<any> {
    return this.appService.getGroups();
  }

  @Get('/groups/:filename')
  async getTimetable(@Param('filename') filename: string): Promise<any> {
    return this.appService.getTimetable(filename);
  }
}
