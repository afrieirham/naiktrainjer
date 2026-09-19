import type { Config } from "@react-router/dev/config";
import propertiesData from "./data/properties.json";

export default {
  ssr: true,
  async prerender() {
    const placePaths = propertiesData.places.map(
      (place) => `/places/${place.slug}`,
    );
    return ["/", ...placePaths];
  },
} satisfies Config;
