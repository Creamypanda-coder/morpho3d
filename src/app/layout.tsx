import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/app/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Image2Model Local - AI-Powered 3D Model Generator",
  description: "Convert images (PNG, JPG, WEBP) to 3D GLB models locally using InstantMesh and OpenAI Vision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full dark antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
