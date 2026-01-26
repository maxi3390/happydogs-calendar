import type { Metadata } from "next";
import "./globals.css";
import { TranslationProvider } from "@/lib/translations";
import { AuthProvider } from "@/lib/auth";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>
          <TranslationProvider>{children}</TranslationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
