"use client"

import { useState } from "react"
import { useCart } from "@/contexts/cart-context"
import { ShoppingBag, Lock } from "lucide-react"
import CheckoutDialog from "./checkout-dialog"

export default function CartSummary({ isOpen = true }: { isOpen?: boolean }) {
  const { items, total, deliveryFee, deliveryTime } = useCart()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  if (items.length === 0) return null 

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const handleOpenCheckout = () => {
    if (!isOpen) {
        alert("A loja está fechada no momento! 🌙");
        return;
    }
    setIsCheckoutOpen(true);
  }

  return (
    <>
      {/* Container Fixo na parte inferior */}
      <div className="fixed bottom-0 left-0 w-full z-50 pointer-events-none pb-6 px-4">
        
        {/* Limite de largura para centralizar (max-w-3xl fica mais elegante) */}
        <div className="max-w-3xl mx-auto pointer-events-auto">
            <button 
              onClick={handleOpenCheckout}
              disabled={!isOpen}
              className={`w-full rounded-full p-4 pl-6 pr-6 flex items-center justify-between shadow-2xl transition-all transform active:scale-[0.98] border-2 border-white/20 backdrop-blur-md
                ${isOpen 
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/30' 
                    : 'bg-gray-800 text-gray-400 cursor-not-allowed grayscale border-gray-600'
                }`}
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-80 mb-0.5">
                  {isOpen ? "Resumo do Pedido" : "Loja Fechada"}
                </span>
                <div className="flex items-center gap-3">
                    <span className="font-extrabold text-xl">
                        {formatMoney(total + deliveryFee)}
                    </span>
                    {isOpen && (
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md text-white font-medium tracking-wide">
                            {deliveryTime > 0 ? `${deliveryTime} min` : 'Calc...'}
                        </span>
                    )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm font-bold bg-white/10 px-5 py-2.5 rounded-full hover:bg-white/20 transition-colors">
                {isOpen ? (
                    <>Ver Sacola <ShoppingBag size={18} /></>
                ) : (
                    <>Fechado <Lock size={18} /></>
                )}
              </div>
            </button>
        </div>
      </div>

      <CheckoutDialog 
        open={isCheckoutOpen} 
        onOpenChange={setIsCheckoutOpen} 
      />
    </>
  )
}