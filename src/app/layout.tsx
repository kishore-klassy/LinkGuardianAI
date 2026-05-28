import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/components/ThemeProvider";

export const metadata: Metadata = {
  title: "ExpireLinkX — Stop Losing Commissions to Broken Affiliate Links",
  description: "AI-powered broken link checker for YouTubers, bloggers, and affiliate marketers. Detects Amazon out-of-stock links that standard checkers miss. Chrome extension + dashboard.",
  keywords: "broken link checker, affiliate link monitor, YouTube broken links, Amazon out of stock, affiliate marketing tool, link rot detector, ExpireLinkX",
  openGraph: {
    title: "ExpireLinkX — Protect Your Affiliate Revenue",
    description: "The average creator loses ₹2,400/month to broken affiliate links. Find yours in 30 seconds.",
    type: "website",
    siteName: "ExpireLinkX",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "ExpireLinkX — Stop Losing Commissions",
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
