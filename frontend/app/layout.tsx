import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Supply Chain Security Analyzer",
  description:
    "Scan GitHub repositories for dependency vulnerabilities, typosquatting, CI/CD risks, secrets, and license issues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} font-sans antialiased`}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
