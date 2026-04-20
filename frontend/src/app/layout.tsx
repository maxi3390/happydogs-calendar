import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TranslationProvider } from "@/lib/translations";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="es" suppressHydrationWarning className="dark">
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <AuthProvider>
          <TranslationProvider>
            <ToastProvider>{children}</ToastProvider>
          </TranslationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
