import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Estante",
    short_name: "Estante",
    description: "Tu estantería de lecturas, y la de tus amigos.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f2e4",
    theme_color: "#f8f2e4",
    icons: [
      { src: "/icons/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
