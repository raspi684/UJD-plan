import { HttpService, Injectable } from '@nestjs/common';
import { parse } from 'node-html-parser';
import * as fs from 'fs';
import path from 'path';
import pdfparse from 'pdf-parse';

@Injectable()
export class AppService {
  groupsPageURL = 'https://zsos.ujd.edu.pl/rozklady_zajec/gindex.html';
  groupTimetableURL = 'https://zsos.ujd.edu.pl/rozklady_zajec';
  // groupsPageURL =
  //   'http://localhost:8000/Uniwersytet%20Humanistyczno-Przyrodniczy%20im.%20Jana%20D%C5%82ugosza%20w%20Cz%C4%99stochowie%20-%20PLAN%20ZAJ%C4%98%C4%86%20-%20Zima%202018_2019.html';
  constructor(private httpService: HttpService) {}

  getGroups(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.httpService
        .get(this.groupsPageURL, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246',
          },
        })
        .toPromise()
        .then((res) => {
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

          resolve(groups);
        })
        .catch(reject);
    });
  }

  async getTimetable(filename: string): Promise<any> {
    if (!fs.existsSync(path.resolve('pdfs', filename))) {
      const res = await this.httpService
        .get(`${this.groupTimetableURL}/${filename}`, {
          responseType: 'arraybuffer',
        })
        .toPromise();
      await fs.promises.writeFile(path.resolve('pdfs', filename), res.data);
    }
    const pdfData = await AppService.loadFromPDF(filename);
    const parsedPDF = await this.parsePDF(pdfData);
    const data = this.parseEntries(parsedPDF);

    return data;
  }

  private static async loadFromPDF(filename: string): Promise<string[]> {
    const file = fs.readFileSync(path.resolve('pdfs', filename));
    const res = await pdfparse(file);

    return res.text.split('\n');
  }

  private async parsePDF(items) {
    const timeRegex = /^(\d\d:\d\d)-/g;
    const timeRegexMess = /(\d\d:\d\d)[2+]/g;
    const weekDays = /^((poniedzia.ek|Pn)|(wtorek|Wt)|(.roda|.r)|(czwartek|Cz)|(pi.tek|Pt)|(sobota|So)|(niedziela|N))$/;

    let header = '';
    const entries = {};
    let currentDay = [];
    let currentKey = '';

    let isHeader = true;
    let idx = -1;

    items.forEach((item) => {
      if (item.length == 0) return;

      const weekDaysResult = weekDays.exec(item);
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
    const weeksPeriod = /Tyg(\s*)((\d{1,2}(-\d{1,2})?)(,*)(\s*))+/;

    const res = {};

    Object.keys(entries).forEach((entry) => {
      entries[entry].forEach((item) => {
        if (!res[entry]) res[entry] = [];

        const hours = timeRegex.exec(item),
          weeks = weeksPeriod.exec(item);
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
