import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Indocs Media — Projects, Receipts & Finance Portal",
  description: "Client receipts, multi-event shoots, and internal profit/expense ledger for Indocs Media.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
