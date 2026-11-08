module.exports = {
  moduleFileExtensions: ['js', 'mjs', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  // .js et .mjs par Babel (babel.config.js) : les paquets publiés en ESM seul passent en CommonJS.
  // rootMode upward : rootDir est src/, babel.config.js est à la racine du projet
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.m?js$': ['babel-jest', { rootMode: 'upward' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!@thallesp/nestjs-better-auth/)'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^better-auth$': '<rootDir>/auth/__mocks__/better-auth.js',
    '^better-auth/api$': '<rootDir>/auth/__mocks__/better-auth-api.js',
    '^better-auth-mikro-orm$': '<rootDir>/auth/__mocks__/better-auth-mikro-orm.js',
    '^better-auth/plugins$': '<rootDir>/auth/__mocks__/better-auth-plugins.js',
    '^better-auth/node$': '<rootDir>/auth/__mocks__/better-auth-node.js',
  },
};
