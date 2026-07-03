import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stellar Shield - Privacy-First Finance on Stellar",
  description:
    "ZK credentials, private payroll, and sealed DAO votes. Verified on-chain by Soroban smart contracts using Noir, RISC Zero, and Circom.",
  openGraph: {
    title: "Stellar Shield",
    description: "Privacy-first ZK finance and governance on Stellar.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-[100dvh] flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
