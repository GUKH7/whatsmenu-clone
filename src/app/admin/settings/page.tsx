"use client"

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { MapPin, Phone, Clock, Search } from 'lucide-react' // Ícones bonitos

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

  useEffect(() => {
    fetchRestaurantData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug])

  async function fetchRestaurantData() {
    try {
      // 1. Busca o restaurante pelo link (slug)
      const { data: restaurantData, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', params.slug)
        .single()

      if (restError || !restaurantData) {
        console.error('Restaurante não encontrado')
        setLoading(false)
        return
      }

      setRestaurant(restaurantData)

      // 2. Busca as categorias desse restaurante (ordenadas)
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .order('order', { ascending: true })

      if (catData) setCategories(catData)

      // 3. Busca os produtos desse restaurante
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

  // Função para formatar preço
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Carregando cardápio...</div>

  if (!restaurant) return <div className="min-h-screen flex items-center justify-center text-red-500">Loja não encontrada :(</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* --- CABEÇALHO DA LOJA --- */}
      <header className="bg-white shadow-sm pb-6">
        <div className="h-32 w-full bg-gray-800 relative overflow-hidden">
            {/* Se tiver banner, coloca aqui. Por enquanto um fundo cinza/cor da marca */}
            <div className="absolute inset-0 opacity-50" style={{ backgroundColor: restaurant.primary_color }}></div>
        </div>
        
        <div className="max-w-3xl mx-auto px-4 -mt-10 relative z-10 text-center">
          <div className="w-24 h-24 mx-auto bg-white rounded-full shadow-md border-4 border-white flex items-center justify-center text-2xl font-bold text-gray-700 overflow-hidden">
             {/* Aqui iria a logo. Usando a inicial por enquanto */}
             {restaurant.name.substring(0,2).toUpperCase()}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mt-3">{restaurant.name}</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">{restaurant.description || 'O melhor da cidade!'}</p>

          <div className="flex justify-center gap-4 mt-4 text-sm text-gray-600">
             <span className="flex items-center gap-1"><Clock size={16} /> Aberto agora</span>
             <span className="flex items-center gap-1"><MapPin size={16} /> Entrega em 30-40min</span>
          </div>
        </div>
      </header>

      {/* --- BARRA DE BUSCA (Opcional, só visual por enquanto) --- */}
      <div className="max-w-3xl mx-auto px-4 mt-6">
        <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="O que você quer comer hoje?" 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500 shadow-sm"
            />
        </div>
      </div>

      {/* --- LISTAGEM DE PRODUTOS POR CATEGORIA --- */}
      <main className="max-w-3xl mx-auto px-4 mt-8 space-y-10">
        
        {categories.map((category) => {
            // Filtra os produtos desta categoria
            const categoryProducts = products.filter(p => p.category_id === category.id)

            // Se não tiver produtos nessa categoria, não mostra o título vazio
            if (categoryProducts.length === 0) return null

            return (
                <section key={category.id}>
                    {/* Título da Categoria */}
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 pl-3" style={{ borderColor: restaurant.primary_color || '#16a34a' }}>
                        {category.name}
                    </h2>

                    {/* Grid de Produtos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryProducts.map((product) => (
                            <div key={product.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                                        <p className="text-gray-500 text-sm line-clamp-2">{product.description}</p>
                                    </div>
                                    <div className="mt-3 font-bold text-green-700">
                                        {formatPrice(product.price)}
                                    </div>
                                </div>

                                {/* Imagem do Produto (Quadrada) */}
                                {product.image_url && (
                                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )
        })}

        {/* Caso existam produtos sem categoria (legado), mostra no final */}
        {products.filter(p => !p.category_id).length > 0 && (
             <section>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Outros</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.filter(p => !p.category_id).map((product) => (
                        <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold">{product.name}</h3>
                            <p className="text-gray-500 text-sm">{product.description}</p>
                            <p className="text-green-600 font-bold mt-2">{formatPrice(product.price)}</p>
                        </div>
                    ))}
                </div>
             </section>
        )}

      </main>
    </div>
  )
}