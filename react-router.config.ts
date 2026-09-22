import type { Config } from "@react-router/dev/config";
import { STATIC_ROUTES } from "./app/lib/routes";

export default {
  ssr: true,
  async prerender() {
    // `/admin` is deliberately not in STATIC_ROUTES: it is built as a shell but
    // kept out of the sitemap. Cloudflare Access protects it, not robots.txt.
    return [...STATIC_ROUTES, "/admin", "/sitemap.xml", "/robots.txt"];
  },
} satisfies Config;
