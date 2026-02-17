module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: { es6: true, node: true },
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'ios/',
    'android/',
    'backend/node_modules/',
    'dist/',
    'build/',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-require-imports': 'off',
    'react/react-in-jsx-scope': 'off',
  },
};

