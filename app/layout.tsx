import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import AppShell from "./components/AppShell";
import "./globals.css";
import "./planning-icon-controls.css";

const plantin = localFont({
  src: "../public/brand/fonts/plantin-mt-pro.woff2",
  display: "swap",
  // The existing Alveary planner assigns this Plantin font file weight 200.
  weight: "200",
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
      <head>
        <Script id="memberstack-cross-subdomain-config" strategy="beforeInteractive">
          {`window.memberstackConfig = { useCookies: true, setCookieOnRootDomain: true };`}
        </Script>
        <Script
          id="alveary-memberstack"
          strategy="beforeInteractive"
          src="https://static.memberstack.com/scripts/v2/memberstack.js"
          data-memberstack-app="app_clbb9rspy00160ujl6tsxbsrj"
          data-memberstack-use-cookies=""
        />
      </head>
      <body className={`${plantin.variable} ${circular.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
