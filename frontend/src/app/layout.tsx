import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "WaterTrace AI — Water Infrastructure Intelligence",
  description: "One report is a complaint. A hundred connected reports may reveal an infrastructure failure.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-slate-50 font-sans antialiased">
        <Suspense fallback={<div className="h-16 bg-white border-b border-slate-200" />}>
          <Navbar />
        </Suspense>
        <main>{children}</main>
      </body>
    </html>
  );
}
