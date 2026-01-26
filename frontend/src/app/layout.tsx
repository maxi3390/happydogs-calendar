import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Happy Pet Nursery - Schedule Management",
  description: "Pet nursery calendar and schedule management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
