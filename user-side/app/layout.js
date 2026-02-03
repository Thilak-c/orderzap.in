"use client";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex";
import { SessionProvider } from "@/lib/session";
import { CartProvider } from "@/lib/cart";
import { TableProvider, useTable } from "@/lib/table";
import { Manrope } from "next/font/google";
import { usePathname } from "next/navigation";
import CallStaffButton from "@/components/CallStaffButton";
import Footer from "@/components/Footer";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

function LayoutContent({ children }) {
  const { tableInfo } = useTable();
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin') || pathname?.startsWith('/demo/admin');

  return (
    <>
      <main className="relative z-10 min-h-screen">
        {children}
      </main>
      {!isAdminPage && <Footer />}
    </>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={manrope.variable}>
      <head>
        <title>OrderZap | How Patna Orders</title>
        <meta name="description" content="Scan, Select, Order - dining experience" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />

        {/* Favicons */}
        <link rel="icon" type="image/x-icon" href="/assets/logos/favicon_io/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/logos/favicon_io/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/logos/favicon_io/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/logos/favicon_io/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/assets/logos/favicon_io/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/assets/logos/favicon_io/android-chrome-512x512.png" />
        <link rel="manifest" href="/assets/logos/favicon_io/site.webmanifest" />
      </head>
      <body className={`${manrope.className} antialiased`}>
        {/* Ambient background glow */}
        <div className="ambient-glow fixed inset-0" aria-hidden="true" />

        <ConvexClientProvider>
          <SessionProvider>
            <CartProvider>
              <TableProvider>
                <LayoutContent>{children}</LayoutContent>
              </TableProvider>
            </CartProvider>
          </SessionProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
