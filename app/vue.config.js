module.exports = {
  productionSourceMap: false,
  css: {
    extract: false
  },
  chainWebpack: config => {
    config.plugin("html").tap(args => {
      args[0].title = "Plany UJD";
      return args;
    });
  }
};
