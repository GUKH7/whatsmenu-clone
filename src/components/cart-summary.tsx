"use client";

import { useState } from "react";
import { useCart } from "@/contexts/cart-context";
import { CheckoutDialog } from "@/components/checkout-dialog";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

interface CartSummaryProps {
  whatsappNumber: string;
}

export function CartSummary({ whatsappNumber }: CartSummaryProps) {
  const { items, totalQuantity, totalPrice } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  if (!items.length) {
    return null;
  }

  const handleViewBag = () => {
    setIsCheckoutOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
        <div className="pointer-events-auto max-w-4xl mx-auto bg-white rounded-full shadow-lg border border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">
              {totalQuantity} item{totalQuantity > 1 ? "s" : ""} na sacola
            </span>
            <span className="text-sm font-semibold text-gray-900">
              Total: {formatCurrency(totalPrice)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleViewBag}
            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-semibold shadow-md hover:bg-emerald-600 active:scale-95 transition"
          >
            Ver Sacola
          </button>
        </div>
      </div>

      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        whatsappNumber={whatsappNumber}
      />
    </>
  );
}

