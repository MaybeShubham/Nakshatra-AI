import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nakshatra AI - Indian Astronomy Scholar",
  description: "Full-stack AI assistant dedicated to Indian Astronomy, historical treatises, mathematical traditions, and calendrical systems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cosmic-950 font-sans">{children}</body>
    </html>
  );
}
