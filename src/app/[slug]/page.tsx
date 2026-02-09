"use client"

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Star, Clock, Search, MapPin } from 'lucide-react'
import ProductDetailsModal from '@/components/product-details-modal'
import CartSummary from '@/components/cart-summary'
import CategoryMenu from '@/components/category-menu' // <--- Importamos aqui
import { useCart } from '@/contexts/cart-context'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  category_id: string
  addons?: { name: string; price: number }[] 
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
  min_delivery_time: number
  opening_time: string 
  closing_time: string 
}

export default function RestaurantPage({ params }: { params: { slug: string } }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { addToCart } = useCart()

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  
  // Controle da Categoria Ativa
  const [activeCategory, setActiveCategory] = useState<string>("")

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
      checkIfOpen(restaurantData.opening_time, restaurantData.closing_time)

      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('order', { ascending: true })

      if (catData) {
          setCategories(catData)
          if(catData.length > 0) setActiveCategory(catData[0].id)
      }

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

  function checkIfOpen(openTime: string, closeTime: string) {
    if (!openTime || !closeTime) return setIsOpen(true);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    const startMinutes = openH * 60 + openM;
    const endMinutes = closeH * 60 + closeM;

    if (endMinutes < startMinutes) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) setIsOpen(true);
        else setIsOpen(false);
    } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) setIsOpen(true);
        else setIsOpen(false);
    }
  }

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleAddToCart = (product: Product, quantity: number, observation: string) => {
    if (!isOpen) {
        alert("A loja está fechada! Não é possível adicionar itens.");
        return;
    }
    addToCart(product, quantity, observation)
    setIsModalOpen(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-600 font-bold animate-pulse">Carregando cardápio...</div>
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center">Loja não encontrada</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-32 font-sans selection:bg-red-100">
      
      {/* Banner */}
      <div className="relative w-full h-40 md:h-52 bg-gray-900">
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop" 
          alt="Capa"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
      </div>

      {/* Cabeçalho */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
            
            <div className="-mt-16 w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-white bg-white shadow-xl overflow-hidden flex-shrink-0 z-10 relative">
                {restaurant.image_url ? (
                   <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-50 text-3xl font-bold text-gray-300">
                     {restaurant.name.substring(0,2).toUpperCase()}
                   </div>
                )}
            </div>
            
            <div className="flex-1 pt-2 md:pt-4"> 
                <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">{restaurant.name}</h1>
                
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-sm font-medium text-gray-600">
                    <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" /> 4.8
                    </span>
                    <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                        <Clock size={14} className="text-gray-400" /> {restaurant.min_delivery_time || '30-40'} min
                    </span>
                    {isOpen ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span> Aberto
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span> Fechado
                        </span>
                    )}
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center justify-center md:justify-start gap-1">
                     <MapPin size={12}/> Horário: {restaurant.opening_time} às {restaurant.closing_time}
                </div>
            </div>
        </div>
      </div>

      {/* Busca (Agora não é mais Sticky) */}
      <div className="px-4 mb-4">
          <div className="max-w-3xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none transition-all text-gray-800 placeholder-gray-400 shadow-sm"
            />
          </div>
      </div>

      {/* MENU GRUDADO (NOVO) */}
      <CategoryMenu 
        categories={categories} 
        selectedCategory={activeCategory} 
        onSelectCategory={setActiveCategory} 
      />

      {/* Listagem */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10 mt-8">
        {categories.map((category) => {
            const categoryProducts = products.filter(p => 
                p.category_id === category.id &&
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            if (categoryProducts.length === 0) return null
            return (
                <section key={category.id} id={category.id} className="scroll-mt-32">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-red-500 pl-3">{category.name}</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {categoryProducts.map((product) => (
                            <div 
                                key={product.id} 
                                onClick={() => handleProductClick(product)}
                                className={`group bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200 transition-all cursor-pointer flex gap-4 ${!isOpen && 'opacity-60 grayscale'}`}
                            >
                                <div className="w-28 h-28 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sem foto</div>
                                    )}
                                </div>

                                <div className="flex flex-col justify-between flex-1 py-1">
                                    <div>
                                        <h3 className="font-bold text-gray-800 leading-tight mb-1">{product.name}</h3>
                                        <p className="text-gray-500 text-xs line-clamp-2">{product.description}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-green-700 font-bold">{formatPrice(product.price)}</span>
                                        <button className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-full font-bold hover:bg-red-100 transition-colors">
                                            Adicionar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )
        })}
      </main>

      <ProductDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        onAddToCart={handleAddToCart}
      />

      <CartSummary isOpen={isOpen} />

    </div>
  )
}