import type { MetadataRoute } from "next"

/**
 * Web app manifest — makes the app installable and run standalone on iPad/phone
 * home screens (served at /manifest.webmanifest; Next links it automatically).
 * TODO: add 192px and 512px PNG icons in /public and reference them here.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DV Books — Series LLC bookkeeping",
    short_name: "DV Books",
    description:
      "Offline-first bookkeeping for a Series LLC property portfolio.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["finance", "business", "productivity"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  }
}
