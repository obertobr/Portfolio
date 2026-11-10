import type { APIRoute } from 'astro';
import { getSiteOrigin } from '../utils/siteOrigin';

export const GET: APIRoute = ({ request, url }) => {
  const siteOrigin = getSiteOrigin(request, url);
  const content = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteOrigin}/sitemap.xml`
  ].join('\n');

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
