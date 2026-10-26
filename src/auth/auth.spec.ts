import { MikroORM, RequestContext } from '@mikro-orm/core';
import { APIError } from 'better-auth/api';

import { EmailService } from '../onesignal/email.service';
import {
  EMAIL_VERIFICATION_TEMPLATE,
  RESET_PASSWORD_TEMPLATE,
} from '../onesignal/onesignal.constants';
import { UserService } from '../user/user.service';
import { auth } from './auth';
import { User } from './entities/user.entity';

type BeforeHook = (ctx: { path: string; body?: object }) => Promise<unknown>;
type EmailOtpOptions = {
  otpLength: number;
  overrideDefaultEmailVerification: boolean;
  sendVerificationOTP: (data: {
    email: string;
    otp: string;
    type: 'sign-in' | 'email-verification' | 'forget-password';
  }) => Promise<void>;
};
type AfterUserCreated = (
  user: { id: string; email: string; name: string },
  ctx: { body?: object } | null,
) => Promise<void>;
type AfterHook = (ctx: {
  request?: object;
  context: { returned: unknown };
  json: (body: object) => object;
}) => Promise<unknown>;

describe('auth', () => {
  const nativeDelete = jest.fn();
  const nativeUpdate = jest.fn();
  const orm = { em: { fork: () => ({ nativeDelete, nativeUpdate }) } } as unknown as MikroORM;
  const userService = { createFromAuthUser: jest.fn(), getMe: jest.fn() };
  const emailService = { sendTemplate: jest.fn() };

  // Le double de better-auth renvoie ses options : on appelle les hooks directement
  const { options } = auth(orm, {
    userService: userService as unknown as UserService,
    emailService: emailService as unknown as EmailService,
  });
  const before = options.hooks.before as unknown as BeforeHook;
  const after = options.hooks.after as unknown as AfterHook;
  const afterUserCreated = options.databaseHooks!.user.create.after as unknown as AfterUserCreated;
  const { options: otpOptions } = options.plugins.find(
    (plugin) => plugin.id === 'email-otp',
  ) as unknown as { options: EmailOtpOptions };

  beforeEach(() => {
    jest.clearAllMocks();
    // Pas de vraie base ici : le contexte MikroORM exécute simplement la fonction
    jest
      .spyOn(RequestContext, 'create')
      .mockImplementation((_em, next: () => unknown) => next() as never);
  });

  // ── Vérification de l'email ────────────────────────────────────────────────

  describe('email verification', () => {
    it('requires a verified email to sign in, with a 5-digit code', () => {
      expect(options.emailAndPassword.requireEmailVerification).toBe(true);
      expect(otpOptions).toMatchObject({ otpLength: 5, overrideDefaultEmailVerification: true });
    });

    it('sends the code by email with the V1 template', async () => {
      await otpOptions.sendVerificationOTP({
        email: 'jean@x.fr',
        otp: '12345',
        type: 'email-verification',
      });

      expect(emailService.sendTemplate).toHaveBeenCalledWith(
        'jean@x.fr',
        EMAIL_VERIFICATION_TEMPLATE,
        { code: '12345' },
      );
    });

    it('sends nothing for the other kinds of code', async () => {
      await otpOptions.sendVerificationOTP({
        email: 'jean@x.fr',
        otp: '12345',
        type: 'forget-password',
      });

      expect(emailService.sendTemplate).not.toHaveBeenCalled();
    });
  });

  // ── Mot de passe oublié ─────────────────────────────────────────────────────

  describe('password reset', () => {
    it('accepts the redirectTo of the mobile app', () => {
      expect(options.trustedOrigins).toContain('restorouen://');
    });

    const sendResetPassword = options.emailAndPassword.sendResetPassword as unknown as (data: {
      user: { email: string };
      url: string;
      token: string;
    }) => Promise<void>;

    it('sends the Better Auth reset link by email, then closes the sessions', async () => {
      const url =
        'https://api.restorouen.fr/auth/reset-password/tok-123?callbackURL=restorouen%3A%2F%2Flanding%2FNewPassword';

      await sendResetPassword({ user: { email: 'jean@x.fr' }, url, token: 'tok-123' });

      expect(emailService.sendTemplate).toHaveBeenCalledWith('jean@x.fr', RESET_PASSWORD_TEMPLATE, {
        url,
      });
      expect(options.emailAndPassword.revokeSessionsOnPasswordReset).toBe(true);
    });

    describe('after the password is reset', () => {
      const onPasswordReset = options.emailAndPassword.onPasswordReset as unknown as (data: {
        user: { id: string; emailVerified: boolean };
      }) => Promise<void>;

      it('verifies the email: the link proved the user owns the address', async () => {
        await onPasswordReset({ user: { id: 'user-1', emailVerified: false } });

        expect(nativeUpdate).toHaveBeenCalledWith(User, { id: 'user-1' }, { emailVerified: true });
      });

      it('leaves an already verified email untouched', async () => {
        await onPasswordReset({ user: { id: 'user-1', emailVerified: true } });

        expect(nativeUpdate).not.toHaveBeenCalled();
      });
    });
  });

  // ── Inscription : avant ─────────────────────────────────────────────────────

  describe('before sign-up', () => {
    const body = {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@x.fr',
      password: 'secret',
    };

    it('builds the name required by Better Auth from the first and last names', async () => {
      expect(await before({ path: '/sign-up/email', body })).toEqual({
        context: { body: { ...body, name: 'Jean Dupont' } },
      });
    });

    it('rejects a sign-up without first name or last name', async () => {
      await expect(
        before({ path: '/sign-up/email', body: { ...body, firstName: undefined } }),
      ).rejects.toThrow(APIError);
      await expect(
        before({ path: '/sign-up/email', body: { ...body, lastName: '' } }),
      ).rejects.toThrow(APIError);
    });

    it('rejects a sign-up without body', async () => {
      await expect(before({ path: '/sign-up/email' })).rejects.toThrow(APIError);
    });

    it('leaves the other routes untouched', async () => {
      expect(await before({ path: '/sign-in/email', body: {} })).toBeUndefined();
    });
  });

  // ── Réponses : le user de /users/me ─────────────────────────────────────────

  describe('after any auth route', () => {
    const me = { id: 'user-1', email: 'jean@x.fr', firstName: 'Jean', lastName: 'Dupont' };
    const call = (returned: unknown, request: object | null = {}) =>
      after({ request: request ?? undefined, context: { returned }, json: (body) => body });

    it('replaces the Better Auth user with the one of GET /users/me', async () => {
      userService.getMe.mockResolvedValue(me);

      const response = await call({ token: 'abc', user: { id: 'user-1', name: 'Jean Dupont' } });

      expect(userService.getMe).toHaveBeenCalledWith('user-1');
      expect(response).toEqual({ token: 'abc', user: me });
    });

    it('leaves the internal calls of the guards untouched (no request)', async () => {
      expect(await call({ user: { id: 'user-1' } }, null)).toBeUndefined();
      expect(userService.getMe).not.toHaveBeenCalled();
    });

    it('leaves the responses without user and the errors untouched', async () => {
      expect(await call({ status: true })).toBeUndefined();
      expect(await call(new APIError('BAD_REQUEST', { message: 'Invalid OTP' }))).toBeUndefined();
      expect(userService.getMe).not.toHaveBeenCalled();
    });

    it('keeps the Better Auth user rather than failing when the AppUser is missing', async () => {
      userService.getMe.mockRejectedValue(new Error('AppUser not found'));

      expect(await call({ user: { id: 'user-1' } })).toBeUndefined();
    });
  });

  // ── Inscription : après la création du User ─────────────────────────────────

  describe('after the user is created', () => {
    const user = { id: 'user-1', email: 'jean@x.fr', name: 'Jean Dupont' };

    it('creates the AppUser and the Person with the first and last names', async () => {
      await afterUserCreated(user, { body: { firstName: 'Jean', lastName: 'Dupont' } });

      expect(userService.createFromAuthUser).toHaveBeenCalledWith({
        userId: 'user-1',
        email: 'jean@x.fr',
        firstName: 'Jean',
        lastName: 'Dupont',
      });
      expect(nativeDelete).not.toHaveBeenCalled();
    });

    it('uses the full name as first name for a Google sign-up', async () => {
      await afterUserCreated(user, { body: { provider: 'google' } });

      expect(userService.createFromAuthUser).toHaveBeenCalledWith({
        userId: 'user-1',
        email: 'jean@x.fr',
        firstName: 'Jean Dupont',
        lastName: undefined,
      });
    });

    it('deletes the user and fails the sign-up when the AppUser or the Person fails', async () => {
      userService.createFromAuthUser.mockRejectedValue(new Error('Database down'));

      await expect(afterUserCreated(user, { body: {} })).rejects.toThrow(APIError);
      expect(nativeDelete).toHaveBeenCalledWith(User, { id: 'user-1' });
    });
  });
});
