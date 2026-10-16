import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Aqion Relay · Business resilience",
  description:
    "Explore synthetic supply recovery options while protecting operating cash. A ResilienceTech web MVP by AqionLabs.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "Aqion Relay",
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#126b5b",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
