"use client";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex";
import { SessionProvider } from "@/lib/session";
import { CartProvider } from "@/lib/cart";
import { TableProvider, useTable } from "@/lib/table";
import { useTheme } from "@/lib/useTheme";
import { Manrope } from "next/font/google";
import CallStaffButton from "@/components/CallStaffButton";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

function LayoutContent({ children }) {
  const { tableInfo } = useTable();
  const theme = useTheme(); // Apply dynamic theme
  
  return (
    <>
      <main className="relative z-10">
        {children}
      </main>
      {tableInfo && (
        <CallStaffButton 
          tableId={tableInfo.tableId} 
          tableNumber={tableInfo.tableNumber}
          zoneName={tableInfo.zoneName}
        />
      )}
    </>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable}`}>
      <head>
        <title>Order Zap | How Patna Order's</title>
        <meta name="description" content="Scan, Select, Order - Scan N Order | The Way People Wants Quick Fast Smart" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
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
