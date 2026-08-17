const appConfig = require("./app.json");

const isLocalE2EDevelopmentBuild = process.env.EAS_BUILD_PROFILE === "development";
const baseExpoConfig = appConfig.expo;
const baseInfoPlist = baseExpoConfig.ios?.infoPlist ?? {};

const developmentInfoPlist = isLocalE2EDevelopmentBuild
  ? {
      ...baseInfoPlist,
      // Permit only local-network hostnames for the disposable E2E API. Do not
      // weaken ATS globally with NSAllowsArbitraryLoads.
      NSAppTransportSecurity: {
        ...baseInfoPlist.NSAppTransportSecurity,
        NSAllowsLocalNetworking: true,
      },
      NSLocalNetworkUsageDescription:
        "JAOTHUI uses your local network only while testing a development build against a local API.",
    }
  : baseInfoPlist;

module.exports = {
  expo: {
    ...baseExpoConfig,
    ios: {
      ...baseExpoConfig.ios,
      infoPlist: developmentInfoPlist,
    },
  },
};
