// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add alias support for @assets
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@assets': path.resolve(__dirname, 'assets'),
};

// Watch the assets folder
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, 'assets'),
];

module.exports = config;
