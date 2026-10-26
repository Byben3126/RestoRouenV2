import type { Response } from 'express';

import { ResetPasswordController } from './reset-password.controller';

describe('ResetPasswordController', () => {
  it('opens the new password screen of the app with the token', () => {
    const res = { redirect: jest.fn() };

    new ResetPasswordController().openApp('tok-123', res as unknown as Response);

    expect(res.redirect).toHaveBeenCalledWith('restoRouen://landing/NewPassword?token=tok-123');
  });
});
