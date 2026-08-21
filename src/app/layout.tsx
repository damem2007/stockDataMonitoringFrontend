import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Signal Dashboard",
  description: "Watchlist and portfolio analysis for TSX, NASDAQ, and NYSE instruments.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
