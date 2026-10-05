module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  transformIgnorePatterns: [],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^better-auth$': '<rootDir>/auth/__mocks__/better-auth.js',
    '^better-auth-mikro-orm$': '<rootDir>/auth/__mocks__/better-auth-mikro-orm.js',
    '^better-auth/plugins$': '<rootDir>/auth/__mocks__/better-auth-plugins.js',
    '^better-auth/node$': '<rootDir>/auth/__mocks__/better-auth-node.js',
  },
};
