// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      '.expo/*',
      'node_modules/*',
      'ios/*',
      'android/*',
      'coverage/*',
      // Deno entry points: checked by Deno, not by this project's tooling.
      'supabase/functions/*/index.ts',
    ],
  },
]);
