import { jest } from '@jest/globals';

/**
 * Jest setup.
 *
 * `react-native-keyboard-controller` binds to its native module at import
 * time, so importing the chat library — which mounts a KeyboardProvider —
 * fails in jest with a missing-native-module error. The package ships a mock
 * for exactly this; registering it here keeps every component test able to
 * render the chat without each one knowing why.
 */
jest.mock('react-native-keyboard-controller', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-keyboard-controller/jest'),
);
