import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import Header from "@/components/layout/Header";
import { MainLayout } from "@/components/layout";
import { Providers } from "./providers";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Funding Metadata Dashboard",
  description: "Dashboard for viewing funding metadata completeness metrics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen bg-gray-50">
        <Providers>
          <Header />
          <main className="pt-6">
            <div className="container mx-auto p-6">
              <MainLayout>
                {children}
              </MainLayout>
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
