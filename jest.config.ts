module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/setupMocks.ts'],          // <-- runs BEFORE framework
  setupFilesAfterFramework: ['<rootDir>/src/setupTests.ts'], // <-- runs AFTER
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
