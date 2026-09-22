import { SITE_URL } from "../lib/routes";

export function loader() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin/

Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
