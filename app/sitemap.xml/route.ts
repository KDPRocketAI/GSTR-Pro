import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "https://www.gstdesk.online";

  const urls = [
    `${baseUrl}/`,
    `${baseUrl}/dashboard`,
    `${baseUrl}/gstr1`,
    `${baseUrl}/history`,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("")}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}