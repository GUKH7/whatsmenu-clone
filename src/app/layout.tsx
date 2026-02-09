import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/cart-context"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WhatsMenu",
  description: "Seu cardápio digital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <CartProvider>
            {children}
        </CartProvider>
      </body>
    </html>
  );
}