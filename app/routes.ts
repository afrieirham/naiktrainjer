import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/browse.tsx"),
  route("contribute", "routes/contribute.tsx"),
  route("contributors", "routes/contributors.tsx"),
  route("places/:placeSlug", "routes/place.tsx"),
  route("admin/*", "routes/admin.tsx"),
  route("sitemap.xml", "routes/sitemap[.]xml.tsx"),
  route("robots.txt", "routes/robots[.]txt.tsx"),
] satisfies RouteConfig;
