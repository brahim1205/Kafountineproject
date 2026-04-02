module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/jest.setup.js'],
  testMatch: ['<rootDir>/test/**/*.test.js'],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: ['dist/src/**/*.js'],
};
