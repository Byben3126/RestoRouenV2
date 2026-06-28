import { MikroORM, RequestContext } from '@mikro-orm/core';
import { betterAuth } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { IncomingMessage, ServerResponse } from 'http';

import { auth } from '@app/auth/auth';

type BetterAuthInstance = ReturnType<typeof betterAuth>;
type SessionResult = Awaited<ReturnType<BetterAuthInstance['api']['getSession']>>;

export function createAuthMiddleware(orm: MikroORM) {
  const betterAuthInstance = auth(orm);

  return async (
    req: IncomingMessage & { headers: Record<string, string | string[] | undefined> },
    res: ServerResponse,
    next: () => void,
  ) => {
    delete req.headers['x-user-id'];

    const session = await RequestContext.create(orm.em, () =>
      betterAuthInstance.api.getSession({
        headers: fromNodeHeaders(req.headers),
      }) as Promise<SessionResult>,
    );

    if (!session) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ statusCode: 401, message: 'Unauthorized' }));
      return;
    }

    req.headers['x-user-id'] = session.user.id;
    next();
  };
}
