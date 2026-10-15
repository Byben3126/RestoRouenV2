import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';
import { AuthService } from '@thallesp/nestjs-better-auth';

import { RealtimeGateway } from './realtime.gateway';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClient(handshake: { headers?: Record<string, string>; auth?: object } = {}) {
  return {
    handshake: { headers: {}, auth: {}, ...handshake },
    join: jest.fn(),
    disconnect: jest.fn(),
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;

  const mockAuthService = {
    api: { getSession: jest.fn<Promise<unknown>, [{ headers: Headers }]>() },
  };
  const sentHeaders = () => mockAuthService.api.getSession.mock.calls[0][0].headers;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: MikroORM, useValue: { em: { fork: jest.fn() } } },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    gateway = module.get(RealtimeGateway);
  });

  // ── handleConnection ────────────────────────────────────────────────────────

  describe('handleConnection', () => {
    it('joins the room of the user authenticated by the token of the handshake', async () => {
      mockAuthService.api.getSession.mockResolvedValue({ user: { id: 'user-1' } });
      const client = makeClient({ auth: { token: 'session-token' } });

      await gateway.handleConnection(client as any);

      expect(sentHeaders().get('authorization')).toBe('Bearer session-token');
      expect(client.join).toHaveBeenCalledWith('user:user-1');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('authenticates with the session cookie when there is no token', async () => {
      mockAuthService.api.getSession.mockResolvedValue({ user: { id: 'user-1' } });
      const client = makeClient({ headers: { cookie: 'better-auth.session_token=abc' } });

      await gateway.handleConnection(client as any);

      expect(sentHeaders().get('cookie')).toBe('better-auth.session_token=abc');
      expect(sentHeaders().get('authorization')).toBeNull();
      expect(client.join).toHaveBeenCalledWith('user:user-1');
    });

    it('disconnects the client when there is no valid session', async () => {
      mockAuthService.api.getSession.mockResolvedValue(null);
      const client = makeClient({ auth: { token: 'expired' } });

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('disconnects the client when the session check fails', async () => {
      mockAuthService.api.getSession.mockRejectedValue(new Error('db down'));
      const client = makeClient();

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });
});
