import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ProVision Production",
  description: "Production management for ProVision Painting",
};

/**
 * Root layout — minimal shell.
 * - Login page renders here (no sidebar/topbar).
 * - Authenticated pages render inside app/(main)/layout.tsx which adds sidebar + topbar.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
