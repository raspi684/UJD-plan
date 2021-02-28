<template>
  <v-container>
    <v-stepper v-model="e6" vertical>
      <v-stepper-step :complete="e6 > 1" step="1">
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
                  @click="e6++"
                  :disabled="groupsFetching || !selectedGroup"
                >
                  Dalej
                </v-btn>
              </v-form>
            </v-col>
          </v-row>
        </v-container>
      </v-stepper-content>

      <v-stepper-step :complete="e6 > 2" step="2">
        Pobieranie informacji
      </v-stepper-step>

      <v-stepper-content step="2">
        <v-progress-linear
          indeterminate
          background-color="transparent"
          v-if="e6 === 2"
        />
      </v-stepper-content>

      <v-stepper-step :complete="e6 > 2" step="3">
        Plan
      </v-stepper-step>

      <v-stepper-content step="3">
        <v-card class="mb-12">
          <v-card-text>
            {{ timetable }}
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
    reset() {
      this.selectedGroup = "";
      this.e6 = 1;
    },
    fetchTimetable() {
      fetch(`${config.base_url}/groups/${this.selectedGroup}`).then(value => {
        value.json().then(json => {
          this.timetable = json;
          this.e6++;
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
  },
  data: () => {
    return {
      groups: [],
      groupsFetching: true,
      selectedGroup: "",
      e6: 1,
      timetable: null
    };
  },
  watch: {
    e6: {
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
