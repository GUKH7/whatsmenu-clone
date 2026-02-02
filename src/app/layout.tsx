import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/contexts/cart-context";

export const metadata: Metadata = {
  title: "WhatsMenu - Cardápio Digital",
  description: "Cardápios digitais personalizados para restaurantes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
