import { handler as appHandler } from '../server/api-handler.js';

function normalizePath(request) {
  const protocol = request.headers['x-forwarded-proto'] ?? 'https';
  const host = request.headers.host ?? 'localhost';
  const url = new URL(request.url ?? '/', `${protocol}://${host}`);
  const rewrittenPath = request.query?.path;

  if (typeof rewrittenPath === 'string' && rewrittenPath.length > 0) {
    return `/api/${rewrittenPath.replace(/^\/+/, '')}`;
  }

  if (Array.isArray(rewrittenPath) && rewrittenPath.length > 0) {
    return `/api/${rewrittenPath.join('/')}`;
  }

  return url.pathname;
}

function buildEvent(request) {
  const body =
    typeof request.body === 'string'
      ? request.body
      : request.body
        ? JSON.stringify(request.body)
        : undefined;

  return {
    httpMethod: request.method,
    path: normalizePath(request),
    headers: request.headers ?? {},
    body,
  };
}

export default async function handler(request, response) {
  const result = await appHandler(buildEvent(request));

  Object.entries(result.headers ?? {}).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  Object.entries(result.multiValueHeaders ?? {}).forEach(([key, values]) => {
    response.setHeader(key, values);
  });

  response.status(result.statusCode ?? 200).send(result.body ?? '');
}
