import { IncomingMessage, ServerResponse } from 'http';

export function adminMiddleware(
  req: IncomingMessage & { headers: Record<string, string | string[] | undefined> },
  res: ServerResponse,
  next: () => void,
) {
  const role = req.headers['x-user-role'] as string | undefined;

  if (role !== 'admin') {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ statusCode: 403, message: 'Forbidden' }));
    return;
  }

  next();
}
