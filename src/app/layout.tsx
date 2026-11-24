import type { Metadata } from "next";
import "./globals.css";
import { DEFAULT_LOGO_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Indocs Media — Projects, Receipts & Finance Portal",
  description: "Quotations, Booking Confirmations, Final Receipts & Internal Finance Ledger for Indocs Media.",
  icons: {
    icon: DEFAULT_LOGO_URL,
    shortcut: DEFAULT_LOGO_URL,
    apple: DEFAULT_LOGO_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
