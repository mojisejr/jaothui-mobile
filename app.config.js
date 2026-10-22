// Expo supplies the evaluated app.json base. Return that base directly so its
// static-config provenance survives Expo Doctor's supported dynamic-config path.
module.exports = ({ config: baseExpoConfig }) => {
  const isLocalE2EDevelopmentBuild = process.env.EAS_BUILD_PROFILE === "development";
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

  return {
    ...baseExpoConfig,
    ios: {
      ...baseExpoConfig.ios,
      infoPlist: developmentInfoPlist,
    },
  };
};
