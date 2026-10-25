import { EventEmitter2 } from '@nestjs/event-emitter';

import { MikroORM } from '@mikro-orm/core';
import { APIError } from 'better-auth/api';

import { auth } from './auth';
import { User } from './entities/user.entity';
import { AUTH_USER_CREATED_EVENT, AuthUserCreatedEvent } from './events/auth-user-created.event';

type BeforeHook = (ctx: { path: string; body?: object }) => Promise<unknown>;
type AfterUserCreated = (
  user: { id: string; email: string; name: string },
  ctx: { body?: object } | null,
) => Promise<void>;

describe('auth', () => {
  const nativeDelete = jest.fn();
  const orm = { em: { fork: () => ({ nativeDelete }) } } as unknown as MikroORM;
  const eventEmitter = { emitAsync: jest.fn() };

  // Le double de better-auth renvoie ses options : on appelle les hooks directement
  const { options } = auth(orm, eventEmitter as unknown as EventEmitter2);
  const before = options.hooks.before as unknown as BeforeHook;
  const afterUserCreated = options.databaseHooks!.user.create.after as unknown as AfterUserCreated;

  beforeEach(() => jest.clearAllMocks());

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

    it('waits for the AppUser and the Person, with the first and last names', async () => {
      eventEmitter.emitAsync.mockResolvedValue([]);

      await afterUserCreated(user, { body: { firstName: 'Jean', lastName: 'Dupont' } });

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        AUTH_USER_CREATED_EVENT,
        new AuthUserCreatedEvent('user-1', 'jean@x.fr', 'Jean Dupont', 'Jean', 'Dupont'),
      );
      expect(nativeDelete).not.toHaveBeenCalled();
    });

    it('only passes the full name for a Google sign-up', async () => {
      eventEmitter.emitAsync.mockResolvedValue([]);

      await afterUserCreated(user, { body: { provider: 'google' } });

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        AUTH_USER_CREATED_EVENT,
        new AuthUserCreatedEvent('user-1', 'jean@x.fr', 'Jean Dupont', undefined, undefined),
      );
    });

    it('deletes the user and fails the sign-up when the AppUser or the Person fails', async () => {
      eventEmitter.emitAsync.mockRejectedValue(new Error('Database down'));

      await expect(afterUserCreated(user, { body: {} })).rejects.toThrow(APIError);
      expect(nativeDelete).toHaveBeenCalledWith(User, { id: 'user-1' });
    });
  });
});
