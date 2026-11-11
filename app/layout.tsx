import type { Metadata } from "next";
import localFont from "next/font/local";
import AppShell from "./components/AppShell";
import "./globals.css";

const plantin = localFont({
  src: "../public/brand/fonts/plantin-mt-pro.woff2",
  display: "swap",
  weight: "400",
  variable: "--font-plantin",
});

const circular = localFont({
  src: "../public/brand/fonts/circular-pro-medium.woff2",
  display: "swap",
  weight: "500",
  variable: "--font-circular",
});

export const metadata: Metadata = {
  title: "Alveary Planning · Development",
  description: "Development foundation for the Alveary planning experience.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${plantin.variable} ${circular.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
