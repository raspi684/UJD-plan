const sentryConfig = {
  dsn: process.env.VUE_APP_SENTRY_DSN || "",
  environment: process.env.NODE_ENV || "prod"
};

const base_url = process.env.VUE_APP_API_URL || "http://localhost:3000/api";

export { sentryConfig, base_url };
