<template>
  <v-container>
    <v-stepper v-model="step" vertical>
      <v-stepper-step :complete="step > 1" step="1">
        Wybierz grupę/prowadzącego
      </v-stepper-step>

      <v-stepper-content step="1">
        <v-container>
          <v-row>
            <v-col sm="12" md="4" lg="3">
              <v-form :disabled="groupsFetching">
                <v-autocomplete
                  placeholder="Wpisz, aby filtrować listę"
                  label="Grupa/Prowadzący"
                  :items="groups"
                  :loading="groupsFetching"
                  item-text="group"
                  item-value="filename"
                  v-model="selectedGroup"
                  :error-messages="groupsError"
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
        Plan {{ groupName && `dla ${groupName}` }}
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
              v-model="calendarType"
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
            <v-sheet height="740">
              <v-calendar
                color="primary"
                ref="calendar"
                :type="calendarType"
                :events="events"
                :value="today"
                :weekdays="[1, 2, 3, 4, 5, 6, 0]"
                v-model="value"
                interval-minutes="30"
                :interval-format="calendarIntervalFormat"
                :first-interval="7 * 2"
                :interval-count="14 * 2"
                locale="pl"
              >
                <template v-slot:day-body="{ date, week }">
                  <div
                    class="v-current-time"
                    :class="{ first: date === week[0].date }"
                    :style="{ top: nowY }"
                  ></div>
                </template> </v-calendar
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
import { base_url } from "@/config/index.js";

export default {
  name: "Home",
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
      this.step = 1;
      this.events = [];
    },
    fetchTimetable() {
      fetch(`${base_url}/groups/${this.selectedGroup}`).then(value => {
        value.json().then(json => {
          if (json?.statusCode) {
            this.groupsError = json.message;
            this.reset();
          } else {
            Object.keys(json).forEach((items, idx) => {
              json[items].forEach(item => {
                const [
                  // eslint-disable-next-line no-unused-vars
                  all,
                  from,
                  to
                ] = /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/.exec(item.hours);
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
            this.groupsError = "";
          }
        });
      });
    },
    getCurrentTime() {
      return this.cal
        ? this.cal.times.now.hour * 60 + this.cal.times.now.minute
        : 0;
    },
    scrollToTime() {
      const time = this.getCurrentTime();
      const first = Math.max(0, time - (time % 30) - 30);

      this.cal.scrollToTime(first);
    },
    updateTime() {
      setInterval(() => this.cal.updateTimes(), 1 * 1000);
    },
    calendarIntervalFormat(interval) {
      return interval.time;
    }
  },
  mounted() {
    this.selectedGroup = this.$route.query.qa || "";
    this.calendarType = this.$route.query.pt || "week";
    if (this.selectedGroup) this.step = 2;

    fetch(`${base_url}/groups`).then(value => {
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

    this.ready = true;
    this.scrollToTime();
    this.updateTime();
  },
  data: () => {
    return {
      calendarType: "week",
      types: [
        { text: "Dzień", value: "day" },
        { text: "Tydzień", value: "week" },
        { text: "Miesiąc", value: "month" }
      ],
      value: "",
      groups: [],
      groupsFetching: true,
      selectedGroup: "",
      step: 1,
      today: new Date(),
      events: [],
      calendarTitle: "",
      groupsError: "",
      ready: false
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
    },
    selectedGroup: {
      handler(val) {
        if (this.$route.query.qa === val) return;
        this.$router.push({ query: { ...this.$route.query, qa: val } });
      }
    },
    calendarType: {
      handler(val) {
        if (this.$route.query.pt === val) return;
        this.$router.push({ query: { ...this.$route.query, pt: val } });
      }
    }
  },
  computed: {
    groupName: {
      get() {
        let groupName =
          this.groups &&
          this.groups.filter(i => i.filename === this.selectedGroup)[0];
        return groupName?.group?.split(",")[1];
      }
    },
    cal() {
      return this.ready ? this.$refs.calendar : null;
    },
    nowY() {
      return this.cal ? this.cal.timeToY(this.cal.times.now) + "px" : "-10px";
    }
  }
};
</script>

<style lang="scss">
.v-current-time {
  height: 2px;
  background-color: #22bc8e;
  position: absolute;
  left: -1px;
  right: 0;
  pointer-events: none;

  &.first::before {
    content: "";
    position: absolute;
    background-color: #22bc8e;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-top: -5px;
    margin-left: -6.5px;
  }
}
</style>
