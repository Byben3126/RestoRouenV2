import { MikroORM, RequestContext } from '@mikro-orm/core';
import { APIError } from 'better-auth/api';

import { EmailService } from '../onesignal/email.service';
import { EMAIL_VERIFICATION_TEMPLATE } from '../onesignal/onesignal.constants';
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

describe('auth', () => {
  const nativeDelete = jest.fn();
  const orm = { em: { fork: () => ({ nativeDelete }) } } as unknown as MikroORM;
  const userService = { createFromAuthUser: jest.fn() };
  const emailService = { sendTemplate: jest.fn() };

  // Le double de better-auth renvoie ses options : on appelle les hooks directement
  const { options } = auth(orm, {
    userService: userService as unknown as UserService,
    emailService: emailService as unknown as EmailService,
  });
  const before = options.hooks.before as unknown as BeforeHook;
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
