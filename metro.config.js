const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// crypto-js يحاول require("crypto") (وحدة Node) داخل try/catch؛ نحوّلها إلى وحدة فارغة حتى لا تفشل الحزمة.
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "crypto" && /node_modules[\\/]crypto-js[\\/]/.test(context.originModulePath)) {
    return { type: "empty" };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
