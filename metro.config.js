// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * The web mockup export, and nothing else.
 *
 * `docs/mockup` renders the real screens through react-native-web so the
 * mockup is the app's own components rather than a reconstruction of them.
 * Two packages block a web bundle, neither for any reason to do with this
 * app: expo-sqlite's web worker imports a .wasm the published package does
 * not ship, and react-native-maps has no web build at all.
 *
 * Both are aliased to stubs ONLY when NEARCAST_WEB_MOCKUP=1. Every native
 * build resolves them normally, so this cannot affect what ships.
 */
if (process.env.NEARCAST_WEB_MOCKUP === '1') {
  const stubs = path.join(__dirname, 'docs/mockup/web-stubs');
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web') {
      if (moduleName === 'expo-sqlite/kv-store' || moduleName.startsWith('expo-sqlite')) {
        return { type: 'sourceFile', filePath: path.join(stubs, 'kv-store.js') };
      }
      if (moduleName === 'react-native-maps') {
        return { type: 'sourceFile', filePath: path.join(stubs, 'maps.js') };
      }
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
