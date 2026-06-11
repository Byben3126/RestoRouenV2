module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  transformIgnorePatterns: [],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/', '<rootDir>/libs/'],
  moduleNameMapper: {
    '^@app/database(|/.*)$': '<rootDir>/libs/database/src/$1',
    '^@app/shared(|/.*)$': '<rootDir>/libs/shared/src/$1',
    '^better-auth$': '<rootDir>/__mocks__/better-auth.js',
    '^better-auth-mikro-orm$': '<rootDir>/__mocks__/better-auth-mikro-orm.js',
  },
};
