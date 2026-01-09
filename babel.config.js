module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      // Expo's preset, with import.meta support for libraries like Zustand
      ['babel-preset-expo', { unstable_transformImportMeta: true }],
    ],
    plugins: [
      // Enable "@/..." absolute imports at runtime (matches tsconfig paths)
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@assets': './assets',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      // React Native Reanimated must be last
      'react-native-reanimated/plugin',
    ],
  };
};
