import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
import "roboto-fontface/css/roboto/roboto-fontface.css";
import "@mdi/font/css/materialdesignicons.css";
import * as Sentry from "@sentry/vue";
import { Integrations } from "@sentry/tracing";
import { sentryConfig } from "./config";

Vue.config.productionTip = false;
Sentry.init({
  Vue,
  dsn: sentryConfig,
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0
});

new Vue({
  router,
  vuetify,
  render: h => h(App)
}).$mount("#app");
