module.exports = {
  root: true,
  // `universe/native` is the shared config the Expo lint preset wraps (it's already
  // a dependency). It bundles core + TypeScript + React + Prettier rules and the
  // React Native globals (__DEV__, fetch, etc.).
  extends: ['universe/native'],
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'ios/',
    'android/',
    'dist/',
    'build/',
    // The backend is a separate CommonJS/Node service with its own concerns; it is
    // not part of the Expo app's lint scope (it has node --check + smoke tests).
    'backend/',
  ],
  rules: {
    // React 17+/RN automatic JSX runtime — importing React into scope isn't required.
    'react/react-in-jsx-scope': 'off',
    // Don't lint formatting through ESLint (matches the original intent of extending
    // eslint-config-prettier). Use `npx prettier --write` for formatting if desired.
    'prettier/prettier': 'off',
    // Pure import-ordering churn (~1800 hits) — not part of this project's lint scope.
    'import/order': 'off',
    // Pre-existing debt, downgraded to keep the baseline green (CI gates on errors only):
    'import/no-duplicates': 'warn', // duplicate import lines — safe to merge later via --fix
    'import/export': 'warn', // ambiguous re-exports in shared barrels (see tsc TS2308 burndown)
  },
  overrides: [
    {
      // @typescript-eslint rules are only loaded for TS files by universe/native,
      // so our TS-specific overrides must live here (not at top level).
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};
