<template>
  <v-container>
    <v-stepper v-model="step" vertical>
      <v-stepper-step :complete="step > 1" step="1">
        Wybierz grupę
      </v-stepper-step>

      <v-stepper-content step="1">
        <v-container>
          <v-row>
            <v-col sm="12" md="4" lg="3">
              <v-form :disabled="groupsFetching">
                <v-autocomplete
                  label="Grupa"
                  :items="groups"
                  :loading="groupsFetching"
                  item-text="group"
                  item-value="filename"
                  v-model="selectedGroup"
                ></v-autocomplete>
                <v-btn
                  color="primary"
                  @click="step++"
                  :disabled="groupsFetching || !selectedGroup"
                >
                  Dalej
                </v-btn>
              </v-form>
            </v-col>
          </v-row>
        </v-container>
      </v-stepper-content>

      <v-stepper-step :complete="step > 2" step="2">
        Pobieranie informacji
      </v-stepper-step>

      <v-stepper-content step="2">
        <v-progress-linear
          indeterminate
          background-color="transparent"
          v-if="step === 2"
        />
      </v-stepper-content>

      <v-stepper-step :complete="step > 2" step="3">
        Plan
      </v-stepper-step>

      <v-stepper-content step="3">
        <v-card class="mb-12" flat outlined>
          <v-toolbar color="primary" dark flat>
            <v-btn icon class="ma-2" @click="$refs.calendar.prev()">
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            <v-btn icon class="ma-2" @click="$refs.calendar.next()">
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
            <v-select
              v-model="type"
              :items="types"
              dense
              outlined
              hide-details
              class="ma-2"
              label="Zakres"
            ></v-select>
            <v-toolbar-title v-if="$refs.calendar">
              {{ calendarTitle }}
            </v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-sheet height="640">
              <v-calendar
                color="primary"
                ref="calendar"
                :type="type"
                :events="events"
                :value="today"
                :weekdays="[1, 2, 3, 4, 5, 6, 0]"
                v-model="value"
                interval-minutes="60"
                first-interval="7"
                interval-count="14"
                locale="pl"
              ></v-calendar
            ></v-sheet>
          </v-card-text>
        </v-card>

        <v-btn color="secondary" @click="reset">Powrót</v-btn>
      </v-stepper-content>
    </v-stepper>
  </v-container>
</template>

<script>
// @ is an alias to /src
import config from "@/config/index.js";

export default {
  name: "Home",
  components: {},
  methods: {
    getWeek: date => {
      const onejan = new Date(date.getFullYear(), 0, 1);
      return Math.ceil(((date - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    },
    getDateFromWeekAndDayOfWeek(year, weekNo, dayOfWeek, time) {
      const d1 = new Date(year, 1, 1);
      const numOfDaysPastSinceLastMonday = d1.getDay() - 1;
      d1.setDate(d1.getDate() - numOfDaysPastSinceLastMonday);
      const weekNoToday = this.getWeek(d1);
      const weeksInTheFuture = weekNo - weekNoToday;
      d1.setDate(d1.getDate() + 7 * weeksInTheFuture + dayOfWeek);
      d1.setHours(time.split(":")[0]);
      d1.setMinutes(time.split(":")[1]);
      return d1;
    },
    reset() {
      this.selectedGroup = "";
      this.step = 1;
      this.events = [];
    },
    fetchTimetable() {
      fetch(`${config.base_url}/groups/${this.selectedGroup}`).then(value => {
        value.json().then(json => {
          Object.keys(json).forEach((items, idx) => {
            json[items].forEach(item => {
              // eslint-disable-next-line no-unused-vars
              const [all, from, to] = /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/.exec(
                item.hours
              );
              const weeks = item.weeks.split(",");
              weeks.forEach(week => {
                const dates = {
                  start: this.getDateFromWeekAndDayOfWeek(
                    2021,
                    +week + 9,
                    idx,
                    from
                  ).toLocaleString("sv"),
                  end: this.getDateFromWeekAndDayOfWeek(
                    2021,
                    +week + 9,
                    idx,
                    to
                  ).toLocaleString("sv")
                };

                this.events.push({
                  name: `${item.subject.name} | ${item.subject.lecturer} | ${item.subject.group}`,
                  ...dates
                });
              });
            });
          });
          this.step++;
        });
      });
    }
  },
  mounted() {
    fetch(`${config.base_url}/groups`).then(value => {
      value.json().then(json => {
        this.groups = json;
        this.groupsFetching = false;
      });
    });
    this.$watch(
      () => {
        return this.$refs.calendar.title;
      },
      val => {
        this.calendarTitle = val;
      }
    );
    this.calendarTitle = this.$refs.calendar.title;
  },
  data: () => {
    return {
      type: "month",
      types: [
        { text: "Miesiąc", value: "month" },
        { text: "Tydzień", value: "week" },
        { text: "Dzień", value: "day" }
      ],
      value: "",
      groups: [],
      groupsFetching: true,
      selectedGroup: "",
      step: 1,
      today: new Date(),
      events: [],
      calendarTitle: ""
    };
  },
  watch: {
    step: {
      deep: true,
      handler(val) {
        if (val === 2) {
          this.fetchTimetable();
        }
      }
    }
  }
};
</script>
