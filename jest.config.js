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
    '^@app/auth(|/.*)$': '<rootDir>/apps/auth/src/$1',
    '^better-auth$': '<rootDir>/apps/auth/src/__mocks__/better-auth.js',
    '^better-auth-mikro-orm$': '<rootDir>/apps/auth/src/__mocks__/better-auth-mikro-orm.js',
    '^better-auth/plugins$': '<rootDir>/apps/auth/src/__mocks__/better-auth-plugins.js',
  },
};
