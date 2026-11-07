/** Tests unitaires purs (sans base de données) : `npm run test:unit`. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  testTimeout: 10000,
  clearMocks: true,
};
