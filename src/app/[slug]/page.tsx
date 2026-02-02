import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import { CartSummary } from "@/components/cart-summary";

interface RestaurantPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Buscar restaurante pelo slug
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  // Se não encontrado ou erro, exibir 404
  if (error || !restaurant) {
    notFound();
  }

  // Buscar categorias do restaurante
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("order", { ascending: true });

  // Buscar produtos do restaurante
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  const productsByCategoryId =
    products?.reduce<Record<string, typeof products>>((acc, product) => {
      if (!acc[product.category_id]) {
        acc[product.category_id] = [];
      }
      acc[product.category_id].push(product);
      return acc;
    }, {}) ?? {};

  const backgroundColor = restaurant.color_theme || "#25D366";
  const whatsappUrl = `https://wa.me/${restaurant.whatsapp_number.replace(
    /\D/g,
    "",
  )}`;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cabeçalho do Restaurante */}
      <header
        className="relative py-8 px-4 text-white shadow-lg"
        style={{ backgroundColor }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {restaurant.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt={`Logo ${restaurant.name}`}
                  className="w-16 h-16 rounded-full bg-white object-cover shadow-md"
                />
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {restaurant.name}
                </h1>
                <p className="text-sm opacity-90 mt-1">Cardápio Digital</p>
              </div>
            </div>

            {/* Botão WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-shadow font-medium"
              aria-label="Contato via WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        {categories && categories.length > 0 ? (
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryProducts = productsByCategoryId[category.id] ?? [];

              if (categoryProducts.length === 0) {
                return null;
              }

              return (
                <section key={category.id} className="text-left">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4">
                    {category.name}
                  </h2>

                  <div className="space-y-4">
                    {categoryProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        name={product.name}
                        description={product.description}
                        price={product.price}
                        image_url={product.image_url}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-600">
            <h2 className="text-lg md:text-xl font-semibold mb-2">
              Nenhum produto cadastrado ainda.
            </h2>
            <p className="text-sm text-gray-500">
              Assim que o cardápio for configurado, os produtos aparecerão aqui.
            </p>
          </div>
        )}
      </section>

      <CartSummary whatsappNumber={restaurant.whatsapp_number} />
    </main>
  );
}
