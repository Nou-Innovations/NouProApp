module.exports = function(api) {
  // Cache key depends on NODE_ENV so the production-only plugin below is
  // applied in release builds and skipped in dev (where logs are useful).
  api.cache.using(() => process.env.NODE_ENV);
  const isProduction = process.env.NODE_ENV === 'production';
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
      // Strip console.* from production bundles, but keep error/warn.
      ...(isProduction
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
      // React Native Reanimated must be last
      'react-native-reanimated/plugin',
    ],
  };
};
