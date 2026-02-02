"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "whatsmenu_cart";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
}

type ProductInput = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
};

interface CartContextValue {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  addToCart: (product: ProductInput, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Carregar do localStorage ao montar
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho do localStorage", error);
    }
  }, []);

  // Salvar no localStorage sempre que o carrinho mudar
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Erro ao salvar carrinho no localStorage", error);
    }
  }, [items]);

  const addToCart = (product: ProductInput, quantity: number = 1) => {
    if (quantity <= 0) return;

    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        // Agrupar itens iguais: apenas aumenta a quantidade
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          quantity,
        },
      ];
    });
  };

  // removeFromCart aqui significa "remover 1 unidade" (usado no botão -)
  const removeFromCart = (productId: string) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === productId);
      if (!existing) return prev;

      if (existing.quantity <= 1) {
        return prev.filter((item) => item.id !== productId);
      }

      return prev.map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item,
      );
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const { totalQuantity, totalPrice } = useMemo(() => {
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    return { totalQuantity: quantity, totalPrice: total };
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalQuantity,
      totalPrice,
      addToCart,
      removeFromCart,
      clearCart,
    }),
    [items, totalQuantity, totalPrice],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart deve ser usado dentro de um CartProvider");
  }

  return context;
}

