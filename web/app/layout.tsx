import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ETH Pool | DeFi Lending",
  description: "Pool ETH and borrow — decentralized lending",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrains.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased font-mono`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
