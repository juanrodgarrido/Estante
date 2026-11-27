import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Estante", template: "%s · Estante" },
  description: "Tu estantería de lecturas, y la de tus amigos.",
  applicationName: "Estante",
  appleWebApp: {
    capable: true,
    title: "Estante",
    // Con "black-translucent" iOS recorta la ventana 59 px por abajo (innerHeight 873 de 932) y la barra inferior queda subida.
    statusBarStyle: "black",
  },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f2e4" },
    { media: "(prefers-color-scheme: dark)", color: "#1d140d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${instrumentSans.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <OfflineBanner />
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
