const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Edge Functions are Deno, not React Native: different runtime, different
    // globals, different module resolution. They are typechecked by the Deno
    // toolchain when they run, not by the app's TypeScript project.
    ignores: ['dist/**', 'supabase/functions/**'],
  },
]);
