import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://autoseater.com";

export const metadata: Metadata = {
  title: {
    default: "AutoSeater — Free Wedding & Event Seating Chart Maker",
    template: "%s | AutoSeater",
  },
  description:
    "Plan your seating chart in minutes. AI floor plans, drag-and-drop assignments, QR check-in, and TV display mode. $14.99 one-time — no subscription.",
  keywords: [
    "seating chart maker",
    "wedding seating chart",
    "event seating chart",
    "seating arrangement app",
    "wedding table planner",
    "free seating chart",
    "seating chart generator",
    "wedding planning tool",
  ],
  authors: [{ name: "AutoSeater" }],
  creator: "AutoSeater",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "AutoSeater",
    title: "AutoSeater — The Seating Chart Tool That Doesn't Charge Monthly",
    description:
      "Plan your wedding or event seating in minutes. AI-powered floor plans, drag-and-drop, QR check-in. $14.99 one-time — no subscription.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoSeater — Free Wedding & Event Seating Chart Maker",
    description:
      "AI-powered seating charts. Drag-and-drop assignments. QR check-in. $14.99 one-time — no subscription.",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <html lang="en">
      <head>
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
