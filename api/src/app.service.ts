import {
  BadRequestException,
  CACHE_MANAGER,
  HttpService,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { WebsiteParser } from './utils/website.parser';
import { urls } from './config';

@Injectable()
export class AppService {
  constructor(
    private httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getGroups() {
    const cachedGroups = await this.cacheManager.get('groups');
    if (cachedGroups) {
      return cachedGroups;
    }

    try {
      const fullIndexHTML = await this.httpService
        .get(urls.indexUrl, { responseType: 'arraybuffer' })
        .toPromise();

      const groups = await WebsiteParser.extractGroups(fullIndexHTML.data);

      // Keep groups in cache for 24 hours
      await this.cacheManager.set('groups', groups, { ttl: 60 * 60 * 24 });

      return groups;
    } catch (e) {
      if (e?.response) {
        switch (e.response.status) {
          case 404:
            throw new NotFoundException();
          default:
            throw new InternalServerErrorException();
        }
      } else {
        console.error(e.message);
        throw new InternalServerErrorException();
      }
    }
  }

  async getTimetable(filename: string) {
    if (!/.pdf$/.test(filename)) throw new BadRequestException('Invalid group');

    const timetable = await this.cacheManager.get(`group_${filename}`);
    if (timetable && Object.keys(timetable).length > 0) {
      return timetable;
    }

    try {
      const timetablePDF = await this.httpService
        .get(`${urls.timetableUrlPrefix}/${filename}`, {
          responseType: 'arraybuffer',
        })
        .toPromise();

      const data = await WebsiteParser.extractTimetable(timetablePDF.data);

      // Keep timetable in cache for 6 hours
      await this.cacheManager.set(`group_${filename}`, data, {
        ttl: 60 * 60 * 6,
      });

      return data;
    } catch (e) {
      if (e?.response) {
        switch (e.response.status) {
          case 404:
            throw new NotFoundException();
          default:
            throw new InternalServerErrorException();
        }
      } else {
        console.error(e.message);
        throw new InternalServerErrorException();
      }
    }
  }
}
