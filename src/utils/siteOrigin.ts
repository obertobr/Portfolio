export function getSiteOrigin(request: Request, url: URL): string {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, '');
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const rawHost = forwardedHost || request.headers.get('host') || url.host;
  const host = rawHost.split(',')[0].trim();

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isLocal =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]');

  const proto = forwardedProto
    ? forwardedProto.split(',')[0].trim()
    : isLocal
      ? url.protocol.replace(':', '')
      : 'https';

  return `${proto}://${host}`;
}

