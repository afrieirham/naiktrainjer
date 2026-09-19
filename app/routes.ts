import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/browse.tsx"),
  route("places/:placeSlug", "routes/place.tsx"),
] satisfies RouteConfig;
