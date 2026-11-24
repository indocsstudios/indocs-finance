import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Indox Media — Client & Receipt Admin Portal",
  description: "Financial records, multi-event bookings, and downloadable PDF receipts for Indox Media.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
