// Pour Jest uniquement : compile en CommonJS les paquets publiés en ESM seul
// (@thallesp/nestjs-better-auth, qui utilise import.meta.url).
// Le build Nest (webpack + ts-loader) n'utilise pas Babel. Le bundler d'AdminJS, lui, lirait ce
// fichier : la config ne s'applique donc qu'aux fichiers transformés par babel-jest.
module.exports = (api) => {
  const isJest = api.caller((caller) => caller?.name === 'babel-jest');
  if (!isJest) return {};

  return {
    presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
    plugins: ['babel-plugin-transform-import-meta'],
  };
};
