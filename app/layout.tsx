import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "EczemaTrack",
  description: "Track your eczema. Understand your triggers.",
  applicationName: "EczemaTrack",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EczemaTrack",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#9fe870",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
