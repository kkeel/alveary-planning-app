import type { Metadata } from "next";
import AppShell from "./components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alveary Planning · Development",
  description: "Development foundation for the Alveary planning experience.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
