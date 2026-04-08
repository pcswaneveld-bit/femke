import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import AppShell from "./components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Studiehulp",
  description: "Samenvattingen maken en cijfers bijhouden — jouw slimme studieassistent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex overflow-hidden overflow-x-hidden">
          <ThemeProvider />
          <AppShell>{children}</AppShell>
        </body>
    </html>
  );
}
