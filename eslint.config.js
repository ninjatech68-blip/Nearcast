const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'supabase/functions/_shared/database.types.ts'],
    settings: {
      'import/core-modules': [
        'react-native-gifted-chat',
        'react-native-keyboard-controller',
      ],
    },
  },
]);
