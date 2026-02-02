"use client";

import { useState, FormEvent } from "react";
import { useCart } from "@/contexts/cart-context";

type CheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappNumber: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export function CheckoutDialog({
  open,
  onOpenChange,
  whatsappNumber,
}: CheckoutDialogProps) {
  const { items, totalPrice, clearCart } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!items.length) {
      setError("Seu carrinho está vazio.");
      return;
    }

    if (!name.trim() || !phone.trim()) {
      setError("Preencha nome e telefone para finalizar o pedido.");
      return;
    }

    setError(null);

    const addressParts = [
      street.trim(),
      number.trim() && `Nº ${number.trim()}`,
      district.trim() && `Bairro ${district.trim()}`,
    ]
      .filter(Boolean)
      .join(", ");

    const lines: string[] = [];
    lines.push("*PEDIDO NOVO*");
    lines.push("");

    items.forEach((item) => {
      const lineTotal = item.quantity * item.price;
      lines.push(
        `${item.quantity}x ${item.name} - ${formatCurrency(lineTotal)}`,
      );
    });

    lines.push("");
    lines.push(`*Total:* ${formatCurrency(totalPrice)}`);
    lines.push("");
    lines.push(`*Cliente:* ${name.trim()}`);
    lines.push(`*Telefone:* ${phone.trim()}`);

    if (addressParts) {
      lines.push(`*Endereço:* ${addressParts}`);
    }

    const message = lines.join("\n");
    const encodedMessage = encodeURIComponent(message);
    const phoneDigits = whatsappNumber.replace(/\D/g, "");
    const url = `https://wa.me/${phoneDigits}?text=${encodedMessage}`;

    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }

    clearCart();
    onOpenChange(false);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-lg bg-white rounded-3xl sm:rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Finalizar Pedido
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            Fechar
          </button>
        </div>

        {/* Lista de itens */}
        <div className="px-5 pt-4 pb-3 max-h-40 overflow-y-auto">
          <ul className="space-y-2 text-sm text-gray-800">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 min-w-[2rem]">
                    {item.quantity}x
                  </span>
                  <span className="truncate max-w-[9rem] sm:max-w-xs">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-900">
                  {formatCurrency(item.quantity * item.price)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-base font-bold text-emerald-600">
              {formatCurrency(totalPrice)}
            </span>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-5 pt-2 pb-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">
              Nome completo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ex: João da Silva"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">
              Telefone / WhatsApp *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-gray-700">
                Rua / Avenida
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Rua Exemplo"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">
                Número
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="123"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Bairro</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Centro"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 w-full inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-sm font-semibold py-2.5 shadow-md hover:bg-emerald-600 active:scale-95 transition"
          >
            Enviar para WhatsApp
          </button>
        </form>
      </div>
    </div>
  );
}

