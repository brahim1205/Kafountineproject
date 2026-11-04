module.exports = {
  preset: 'ts-jest',
  rootDir: '.',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/jest.setup.js'],
  testMatch: ['<rootDir>/test/**/*.test.js', '<rootDir>/src/**/*.test.ts'],
  // Les tests d'intégration se connectent (bcrypt) dans beforeAll : 5 s par défaut ne suffit pas sur la CI.
  testTimeout: 20000,
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: ['src/**/*.ts'],
};
