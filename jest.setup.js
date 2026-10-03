jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-config', () => ({ API_BASE_URL: 'http://localhost:5000/api' }));
jest.mock('react-native-fs', () => ({ DocumentDirectoryPath: '/tmp', writeFile: jest.fn() }));
/* global jest */
