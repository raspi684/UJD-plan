import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { parse } from 'node-html-parser';
import * as fs from 'fs';
import path from 'path';
import pdfparse from 'pdf-parse';

@Injectable()
export class AppService {
  groupsPageURL = 'https://zsos.ujd.edu.pl/rozklady_zajec/gindex.html';
  groupTimetableURL = 'https://zsos.ujd.edu.pl/rozklady_zajec';
  constructor(
    private httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  getGroups(): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      const cachedGroups = await this.cacheManager.get('groups');
      if (cachedGroups) {
        return resolve(cachedGroups);
      }

      this.httpService
        .get(this.groupsPageURL, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246',
          },
        })
        .toPromise()
        .then(async (res) => {
          const groups = parse(res.data)
            .querySelectorAll('select > option')
            .map((i) => {
              if (i.attributes.value === undefined) return;
              return {
                group: i.innerText,
                filename: i.attributes.value?.split('.')[0] + '.pdf',
              };
            })
            .filter((i) => !!i);

          await this.cacheManager.set('groups', groups, { ttl: 60 * 60 * 24 });
          resolve(groups);
        })
        .catch(reject);
    });
  }

  async getTimetable(filename: string): Promise<any> {
    const timetable = await this.cacheManager.get(`group_${filename}`);
    if (timetable) return timetable;

    const res = await this.httpService
      .get(`${this.groupTimetableURL}/${filename}`, {
        responseType: 'arraybuffer',
      })
      .toPromise();

    const pdfData = await AppService.extractFromPDF(res.data);
    const parsedPDF = await this.parsePDF(pdfData);
    const data = this.parseEntries(parsedPDF);

    await this.cacheManager.set(`group_${filename}`, data, {
      ttl: 60 * 60 * 6,
    });

    return data;
  }

  private static async extractFromPDF(data): Promise<string[]> {
    const res = await pdfparse(data);

    return res.text.split('\n');
  }

  private async parsePDF(items) {
    const timeRegex = /^(\d\d:\d\d)-/g;
    const timeRegexMess = /(\d\d:\d\d)[2+]/g;
    const weekDaysRegex = /^((poniedzia.ek|Pn)|(wtorek|Wt)|(.roda|[^d]r)|(czwartek|Cz)|(pi.tek|Pt)|(sobota|So)|(niedziela|N))$/;

    let header = '';
    const entries = {};
    let currentDay = [];
    let currentKey = '';

    let isHeader = true;
    let idx = -1;

    items.forEach((item) => {
      if (item.length == 0) return;

      const weekDaysResult = weekDaysRegex.exec(item);
      if (weekDaysResult) {
        currentKey = weekDaysResult[0];
        if (!entries[currentKey]) entries[currentKey] = [];
        entries[currentKey].push(...currentDay);
        idx = -1;
        currentDay = [];
      }

      if (timeRegex.test(item)) {
        if (!currentDay[idx + 1]) currentDay[idx + 1] = [];
        currentDay[++idx].push(item);
        isHeader = false;
      } else if (timeRegexMess.test(item)) {
        // Omit unnecessary row
      } else if (header.split(';').includes(item)) {
        // Omit header
      } else {
        if (isHeader) {
          header += `${item};`;
        } else {
          if (weekDaysResult) item = item.replace(weekDaysResult[0], '');

          if (item) {
            if (!currentDay[idx]) currentDay[idx] = [];
            currentDay[idx] += item;
          }
        }
      }
    });

    return entries;
  }

  private parseEntries(entries) {
    const timeRegex = /((\d{2}:\d{2})(-?)){1,2}/;
    const weeksPeriodRegex = /(Tyg\s*|Tydz\s*)((\d{1,2}(-\d{1,2})?)(,*)(\s*))+/;

    const res = {};

    Object.keys(entries).forEach((entry) => {
      entries[entry].forEach((item) => {
        if (!res[entry]) res[entry] = [];

        const hours = timeRegex.exec(item),
          weeks = weeksPeriodRegex.exec(item);

        const subject = item
          .replace(hours[0], '')
          .replace(weeks[0], '')
          .replace(', ', '')
          .split(';');

        res[entry].push({
          hours: hours[0],
          weeks: AppService.convertToFullWeeks(weeks[0]),
          subject: {
            name: subject[0],
            lecturer: subject[1],
            room: subject[2],
            group: subject[3],
          },
        });
      });
    });

    return res;
  }

  private static convertToFullWeeks(weeks: string) {
    if (weeks.startsWith('Tydz')) {
      const newWeeks = weeks.replace('Tydz', '').replace(' ', '');
      return newWeeks;
    }
    const periodRegex = /\d{1,2}-\d{1,2}/;
    const periodGroupsRegex = /(\d{1,2})-(\d{1,2})/;
    let newWeeks = weeks.replace(/Tyg(\s?)/, '').replace(/\s/g, '');

    while (periodRegex.test(newWeeks)) {
      const period = periodRegex.exec(newWeeks)[0];
      const [all, from, to] = periodGroupsRegex.exec(period);
      const newPeriod = [];
      for (let i = parseInt(from); i <= parseInt(to); i++) {
        newPeriod.push(i);
      }
      newWeeks = newWeeks.replace(period, newPeriod.join(','));
    }

    return newWeeks;
  }
}
