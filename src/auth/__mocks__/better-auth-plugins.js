module.exports = {
  admin: jest.fn(() => ({})),
  bearer: jest.fn(() => ({})),
  // Garde ses options : les tests appellent sendVerificationOTP directement
  emailOTP: jest.fn((options) => ({ id: 'email-otp', options })),
  openAPI: jest.fn(() => ({ id: 'open-api' })),
};
