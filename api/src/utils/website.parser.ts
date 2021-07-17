import { parse } from 'node-html-parser';
import { decode } from 'single-byte';
import pdfparse from 'pdf-parse';

export class WebsiteParser {
  static extractGroups(data: any) {
    return parse(decode('windows-1250', data)) // Parse DOM
      .querySelectorAll('select > option') // Get all timetables
      .map((i) => {
        if (i.attributes.value === undefined) return;
        return {
          group: i.innerText,
          filename: i.attributes.value?.split('.')[0] + '.pdf',
        };
      })
      .filter((i) => !!i); // Get only valid timetables
  }

  static async extractTimetable(data: any) {
    const pdfData = await this.extractFromPDF(data);
    const parsedPDF = this.parseRawStrings(pdfData);

    return this.parseEntries(parsedPDF);
  }

  private static async extractFromPDF(data) {
    const res = await pdfparse(data);

    return res.text.split('\n');
  }

  /**
   * Converts array of raw strings into object that contains key (day of week) and value
   * (array of strings (1 string = 1 block from PDF in format: from-to, Tyg 1-3,5,7-9Subject;lecturer;room;group))
   *
   * @param items
   * @private
   */
  private static parseRawStrings(items: string[]): Record<string, string[]> {
    const timeRegex = /^(\d\d:\d\d)-/g;
    const timeRegexMess = /(\d\d:\d\d)[2+]/g;
    const weekDaysRegex = /^((poniedzia.ek|Pn)|(wtorek|Wt)|(.roda|[^d]r)|(czwartek|Cz)|(pi.tek|Pt)|(sobota|So)|(niedziela|N))$/;

    let header = '';
    const entries = {};
    let currentDay = [];
    let currentKey = '';

    let isHeader = true;
    let idx = -1;

    for (let item of items) {
      if (item.length == 0) continue;

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
    }

    return entries;
  }

  /**
   * Converts {dayOfWeek: ['from-to, Tyg1-3Subject;lecturer;room;group', ...]} into object
   * {
   *    dayOfWeek: [{
   *        hours: 'from-to',
   *        weeks: '1,2,3',
   *        subject: {
   *            name: 'Subject',
   *            lecturer: 'lecturer',
   *            room: 'room',
   *            group: 'group'
   *        }
   *    }, ...]
   * }
   * @param entries
   * @private
   */
  private static parseEntries(
    entries: Record<string, string[]>,
  ): Record<string, [Record<string, string | Record<string, string>>]> {
    const timeRegex = /((\d{2}:\d{2})(-?)){1,2}/;
    const weeksPeriodRegex = /(Tyg\s*|Tydz\s*)((\d{1,2}(-\d{1,2})?)(,*)(\s*))+/;

    // Create object like dayOfWeek: []
    const res = Object.fromEntries(Object.keys(entries).map((i) => [[i], []]));

    for (const entry in entries) {
      for (const item of entries[entry]) {
        const hours = timeRegex.exec(item),
          weeks = weeksPeriodRegex.exec(item);

        const subject = item
          .replace(hours[0], '')
          .replace(weeks[0], '')
          .replace(', ', '')
          .split(';');

        res[entry].push({
          hours: hours[0],
          weeks: this.convertToFullWeeks(weeks[0]),
          subject: {
            name: subject[0],
            lecturer: subject[1],
            room: subject[2],
            group: subject[3],
          },
        });
      }
    }
    return res;
  }

  /**
   * Remove 'Tydz' or convert 'Tyg 1-3' into '1,2,3'
   * @param weeks
   * @private
   */
  private static convertToFullWeeks(weeks: string) {
    if (weeks.startsWith('Tydz')) {
      return weeks.replace('Tydz', '').replace(' ', '');
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
