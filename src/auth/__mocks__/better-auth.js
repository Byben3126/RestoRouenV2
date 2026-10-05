module.exports = {
  // Reproduit la forme d'une instance better-auth : le module @thallesp/nestjs-better-auth
  // lit `options.basePath` et son guard global appelle `api.getSession`.
  betterAuth: jest.fn((options = {}) => ({
    handler: jest.fn(),
    api: {
      getSession: jest.fn().mockResolvedValue(null),
    },
    options,
  })),
};
