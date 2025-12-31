import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuickSpend",
  description: "Track daily expenses fast",
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0", 
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QuickSpend",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}