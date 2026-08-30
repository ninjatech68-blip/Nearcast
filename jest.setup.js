// Gifted Chat pulls in three native modules. Each ships a Jest mock for exactly
// this case; without them the match room cannot be rendered in a test.
require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);
