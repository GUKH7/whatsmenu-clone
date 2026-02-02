 "use client";

import { useCart } from "@/contexts/cart-context";

type ProductCardProps = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export function ProductCard({
  id,
  name,
  description,
  price,
  image_url,
}: ProductCardProps) {
  const { items, addToCart, removeFromCart } = useCart();

  const existingItem = items.find((item) => item.id === id);
  const quantity = existingItem?.quantity ?? 0;

  const handleAdd = () => {
    addToCart(
      {
        id,
        name,
        price,
        image_url,
      },
      1,
    );
  };

  const handleRemove = () => {
    removeFromCart(id);
  };

  return (
    <article className="flex items-center gap-4 bg-white rounded-lg shadow-sm border border-gray-100 p-3">
      {/* Imagem do produto (se tiver) */}
      {image_url ? (
        <img
          src={image_url}
          alt={name}
          className="w-16 h-16 rounded-md object-cover bg-gray-100 flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">
          Sem foto
        </div>
      )}

      {/* Informações do produto */}
      <div className="flex-1 text-left">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{name}</h3>
        {description && (
          <p className="text-xs text-gray-600 max-h-[3.5rem] overflow-hidden">
            {description}
          </p>
        )}
        <p className="mt-2 text-sm font-semibold text-gray-900">
          {formatCurrency(price)}
        </p>
      </div>

      {/* Controles do carrinho */}
      {quantity === 0 ? (
        <button
          type="button"
          onClick={handleAdd}
          className="ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-gray-700 text-lg leading-none hover:bg-gray-100 active:scale-95 transition"
          aria-label={`Adicionar ${name} ao carrinho`}
        >
          +
        </button>
      ) : (
        <div className="ml-2 inline-flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1 text-sm">
          <button
            type="button"
            onClick={handleRemove}
            className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 leading-none hover:bg-gray-200 active:scale-95 transition"
            aria-label={`Remover ${name} do carrinho`}
          >
            -
          </button>
          <span className="min-w-[1.5rem] text-center text-xs font-semibold text-gray-800">
            {quantity}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 leading-none hover:bg-gray-200 active:scale-95 transition"
            aria-label={`Adicionar mais ${name} ao carrinho`}
          >
            +
          </button>
        </div>
      )}
    </article>
  );
}

