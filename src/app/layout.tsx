import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Affiliate Manager",
  description: "Affiliate link request management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('affiliate-theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Background Animated Blobs */}
        <div className="fixed inset-0 z-1 overflow-hidden pointer-events-none">
          <div className="absolute rounded-full blur-[80px] animate-float w-125 h-125 bg-[#008a62]/15 dark:bg-[#008a62]/25 -top-[10%] -left-[10%]" />
          <div className="absolute rounded-full blur-[80px] animate-float w-100 h-100 bg-indigo-600/10 dark:bg-indigo-600/20 -bottom-[10%] -right-[5%]" style={{ animationDelay: "-5s" }} />
          <div className="absolute rounded-full blur-[80px] animate-float w-75 h-75 bg-sky-400/15 top-[40%] left-[50%]" style={{ animationDelay: "-10s" }} />
        </div>

        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
