import type { APIRoute } from 'astro';
import { getProjects } from '../services/portfolioData.js';
import { getSiteOrigin } from '../utils/siteOrigin';

export const GET: APIRoute = async ({ request, url }) => {
  const siteOrigin = getSiteOrigin(request, url);
  const projectsData = await getProjects();

  let lastMod = new Date().toISOString().split('T')[0];
  if (projectsData?.all?.length > 0 && projectsData.all[0].updated_at) {
    lastMod = new Date(projectsData.all[0].updated_at).toISOString().split('T')[0];
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteOrigin}/</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteOrigin}/projetos</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
};
