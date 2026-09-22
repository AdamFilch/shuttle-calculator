const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite runs SQLite as WebAssembly on web (via a worker). Metro doesn't
// treat `.wasm` as an asset by default, so the worker's `wa-sqlite.wasm`
// import fails to resolve — register it as a binary asset like any other.
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = withNativeWind(config, { input: './global.css' });
