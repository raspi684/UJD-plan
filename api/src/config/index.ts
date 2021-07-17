import { SentryModuleOptions } from '@ntegral/nestjs-sentry';

export const sentryConfig: SentryModuleOptions = {
  dsn: process.env.API_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'dev',
};

export const appConfig = {
  port: parseInt(process.env.PORT) || 3000,
};

export const urls = {
  indexUrl:
    process.env.INDEX_URL ||
    'https://zsos.ujd.edu.pl/rozklady_zajec/fullindex.html',
  timetableUrlPrefix:
    process.env.TIMETABLE_URL_PREFIX ||
    'https://zsos.ujd.edu.pl/rozklady_zajec',
};
