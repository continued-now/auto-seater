import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App",
  description: "Create and manage your event seating chart with AutoSeater.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/app",
  },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
