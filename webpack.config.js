const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: [/^@adminjs\//],
      }),
    ],
    resolve: {
      ...options.resolve,
      conditionNames: ['import', 'require', 'node', 'default'],
      extensionAlias: {
        '.js': ['.ts', '.js'],
        '.mjs': ['.mts', '.mjs'],
      },
    },
  };
};
