import type { MetadataRoute } from "next";

// Lets people add BreatheWise to their phone's home screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BreatheWise — air-pollution coach",
    short_name: "BreatheWise",
    description: "Live AQI, the cleanest hours and an AI plan for your family's day — in English and Hindi.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ee",
    theme_color: "#3f6b5c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
