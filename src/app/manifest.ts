import type { MetadataRoute } from "next";
import {
  SITE_DESCRIPTION,
  SITE_ICON,
  SITE_NAME,
  SITE_SHORT_NAME,
} from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    lang: "en",
    icons: [
      {
        src: SITE_ICON,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: SITE_ICON,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
