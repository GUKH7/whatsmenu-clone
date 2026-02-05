"use client"

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Star, Clock, Search, ShoppingBag } from 'lucide-react'
import ProductDetailsModal from '@/components/product-details-modal'
import CartSummary from '@/components/cart-summary' // <--- IMPORTADO

// --- Tipos ---
interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  category_id: string
}

interface Category {
  id: string
  name: string
  order: number
}

interface Restaurant {
  id: string
  name: string
  description: string
  primary_color: string
  slug: string
  image_url: string | null
  // AQUI: Troque "phone" por:
  whatsapp_number: string | null 
  latitude: number
  longitude: number
  price_per_km: number
  min_delivery_time: number
}

interface CartItem {
  product: Product
  quantity: number
  observation: string
}

export default function RestaurantPage({ params }: { params: { slug: string } }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Estado do Carrinho
  const [cart, setCart] = useState<CartItem[]>([])
  
  // Controle dos Modais
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false) // Controle da Sacola

  useEffect(() => {
    fetchRestaurantData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug])

  async function fetchRestaurantData() {
    try {
      const { data: restaurantData, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', params.slug)
        .single()

      if (error || !restaurantData) return

      setRestaurant(restaurantData)

      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('order', { ascending: true })

      if (catData) setCategories(catData)

      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
    
      if (prodData) setProducts(prodData)

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  // Abre modal do produto
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  // Adiciona ao Carrinho
  const handleAddToCart = (product: Product, quantity: number, observation: string) => {
    const newItem: CartItem = { product, quantity, observation }
    setCart([...cart, newItem])
    setIsModalOpen(false)
  }

  // Remove do Carrinho (Nova função!)
  const handleRemoveFromCart = (indexToRemove: number) => {
    setCart(cart.filter((_, index) => index !== indexToRemove))
  }

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Carregando...</div>
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center">Loja não encontrada</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* Banner */}
      <div className="relative w-full h-40 md:h-52 bg-gray-200">
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop" 
          alt="Capa"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
      </div>

      {/* Cabeçalho */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start -mt-12 gap-4 md:gap-6 text-center md:text-left">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex-shrink-0 z-10 relative">
                {restaurant.image_url ? (
                   <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-50 text-2xl font-bold text-gray-400">
                     {restaurant.name.substring(0,2).toUpperCase()}
                   </div>
                )}
            </div>
            <div className="flex-1 pt-2 md:pt-14"> 
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 leading-tight">{restaurant.name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1 text-yellow-500 font-bold"><Star size={16} fill="currentColor" /> 4.8</span>
                            <span className="flex items-center gap-1"><Clock size={16} /> 30-45 min</span>
                            <span className="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">Entrega Grátis</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Busca */}
      <div className="sticky top-0 z-20 bg-white shadow-sm py-4 px-4 mb-6 border-b border-gray-100">
          <div className="max-w-5xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500" size={20} />
            <input 
                type="text"
                placeholder="Buscar no cardápio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all text-gray-700 placeholder-gray-400"
            />
          </div>
      </div>

      {/* Listagem */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
        {categories.map((category) => {
            const categoryProducts = products.filter(p => 
                p.category_id === category.id &&
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            )

            if (categoryProducts.length === 0) return null

            return (
                <section key={category.id}>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">{category.name}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                        {categoryProducts.map((product) => (
                            <div 
                                key={product.id} 
                                onClick={() => handleProductClick(product)}
                                className="group bg-white rounded-lg border border-gray-100 p-4 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer flex justify-between gap-4 h-full"
                            >
                                <div className="flex flex-col justify-between flex-1">
                                    <div>
                                        <h3 className="font-semibold text-gray-800 text-lg leading-tight mb-2">{product.name}</h3>
                                        <p className="text-gray-500 text-xs sm:text-sm line-clamp-3 leading-relaxed">{product.description}</p>
                                    </div>
                                    <div className="mt-3 font-medium text-gray-900">
                                        <span className="text-green-700">{formatPrice(product.price)}</span>
                                    </div>
                                </div>
                                <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300"><div className="text-xs text-center p-2">Sem foto</div></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )
        })}
      </main>

      {/* BARRA DA SACOLA */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 animate-slide-up">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs font-medium">Total sem entrega</span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-gray-900">{formatPrice(cartTotal)}</span>
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                           {cartCount} item{cartCount > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={() => setIsCartOpen(true)} // <--- AGORA ABRE A SACOLA!
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-red-200"
                >
                    Ver Sacola <ShoppingBag size={18} />
                </button>
            </div>
        </div>
      )}

      {/* MODAL DO PRODUTO */}
      <ProductDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        onAddToCart={handleAddToCart}
      />

      {/* MODAL DA SACOLA (NOVO!) */}
      <CartSummary
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={handleRemoveFromCart}
        // AQUI: Mude de restaurant?.phone para:
        restaurantPhone={restaurant?.whatsapp_number} 
        restaurantId={restaurant?.id}
        restaurantLat={restaurant?.latitude}
        restaurantLng={restaurant?.longitude}
        pricePerKm={restaurant?.price_per_km}
        baseTime={restaurant?.min_delivery_time}
      />

    </div>
  )
}