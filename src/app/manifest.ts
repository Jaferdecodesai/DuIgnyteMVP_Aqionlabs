import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aqion Relay",
    short_name: "Relay",
    description: "Synthetic business resilience workbench",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#126b5b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
