import { IncomingMessage, ServerResponse } from 'http';

export function mediaMiddleware(
  req: IncomingMessage & { headers: Record<string, string | string[] | undefined> },
  _res: ServerResponse,
  next: () => void,
) {
  const userId = req.headers['x-user-id'] as string;

  delete req.headers['x-user-id'];
  delete req.headers['x-media-owner'];
  delete req.headers['x-media-secret'];

  req.headers['x-media-owner'] = userId;
  req.headers['x-media-secret'] = process.env.MEDIA_SECRET;

  next();
}
