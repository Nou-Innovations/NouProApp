module.exports = {
  root: true,
  // `universe/native` is the shared config the Expo lint preset wraps (it's already
  // a dependency). It bundles core + TypeScript + React + Prettier rules and the
  // React Native globals (__DEV__, fetch, etc.).
  extends: ['universe/native'],
  globals: {
    // Provided by Hermes/React Native at runtime but missing from the
    // universe/native env sets — without these, `no-undef` false-positives.
    URLSearchParams: 'readonly',
    atob: 'readonly',
    btoa: 'readonly',
    // TS ambient namespace (NodeJS.Timeout in timer refs) — type-only, from @types/node.
    NodeJS: 'readonly',
  },
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
    // Catches bare/undefined identifiers (e.g. `alignItems: center`, using an
    // un-imported symbol). Hermes only throws these at RUNTIME, and tsc isn't
    // gating CI yet (156-error backlog) — this rule is the safety net that would
    // have caught all 3 crashes shipped to production in June 2026.
    'no-undef': 'error',
    // React 17+/RN automatic JSX runtime — importing React into scope isn't required.
    'react/react-in-jsx-scope': 'off',
    // Don't lint formatting through ESLint (matches the original intent of extending
    // eslint-config-prettier). Use `npx prettier --write` for formatting if desired.
    'prettier/prettier': 'off',
    // Pure import-ordering churn (~1800 hits) — not part of this project's lint scope.
    'import/order': 'off',
    // import/no-duplicates and import/export keep universe's default 'error' — the
    // pre-existing violations were resolved in this pass (duplicate imports merged,
    // ambiguous barrel re-exports fixed), so they now guard against regressions.
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
        // typescript-eslint's base config turns no-undef OFF for TS files (it
        // assumes tsc gates instead — which it doesn't here yet). Re-enable; see
        // the top-level rules comment.
        'no-undef': 'error',
      },
    },
  ],
};
