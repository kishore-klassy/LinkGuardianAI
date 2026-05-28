import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/components/ThemeProvider";

export const metadata: Metadata = {
  title: "LinkGuardian.AI — Stop Losing Commissions to Broken Affiliate Links",
  description: "AI-powered broken link checker for YouTubers, bloggers, and affiliate marketers. Detects Amazon out-of-stock links that standard checkers miss. Chrome extension + dashboard.",
  keywords: "broken link checker, affiliate link monitor, YouTube broken links, Amazon out of stock, affiliate marketing tool, link rot detector, LinkGuardian AI",
  openGraph: {
    title: "LinkGuardian.AI — Protect Your Affiliate Revenue",
    description: "The average creator loses ₹2,400/month to broken affiliate links. Find yours in 30 seconds.",
    type: "website",
    siteName: "LinkGuardian.AI",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkGuardian.AI — Stop Losing Commissions",
    description: "AI-powered broken link checker. Find lost revenue in 30 seconds.",
  },
  robots: "index, follow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var t = localStorage.getItem('theme');
                if (t === 'light') document.documentElement.classList.remove('dark');
                else document.documentElement.classList.add('dark');
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
