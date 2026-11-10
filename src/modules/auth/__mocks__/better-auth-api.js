// better-auth n'est publié qu'en ESM : Jest charge ce double à la place de 'better-auth/api'
class APIError extends Error {
  constructor(status, body) {
    super(body?.message);
    this.status = status;
    this.body = body;
  }
}

module.exports = {
  APIError,
  // Le middleware est la fonction elle-même : les tests peuvent l'appeler directement
  createAuthMiddleware: jest.fn((handler) => handler),
};
