<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>
        Plany UJD
      </v-app-bar-title>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: "App",

  data: () => ({
    //
  })
};
</script>
