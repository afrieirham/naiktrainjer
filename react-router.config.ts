import type { Config } from "@react-router/dev/config";
import { STATIC_ROUTES } from "./app/lib/routes";

export default {
  ssr: true,
  async prerender() {
    return [...STATIC_ROUTES, "/sitemap.xml", "/robots.txt"];
  },
} satisfies Config;
