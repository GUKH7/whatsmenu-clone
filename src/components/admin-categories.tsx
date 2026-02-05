"use client"

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr' // <--- Usando a biblioteca certa

interface Category {
  id: string
  name: string
  restaurant_id: string
  order: number | null
}

interface AdminCategoriesProps {
  restaurantId: string
}

export default function AdminCategories({ restaurantId }: AdminCategoriesProps) {
  // Criando o cliente do jeito novo
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newCatName, setNewCatName] = useState('')

  useEffect(() => {
    if (restaurantId) {
      fetchCategories()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order', { ascending: true })

      if (error) throw error
      
      setCategories((data as Category[]) || [])
    } catch (err) {
      console.error('Erro ao buscar categorias:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([
          { 
            name: newCatName, 
            restaurant_id: restaurantId,
            order: categories.length + 1 
          }
        ])
        .select()

      if (error) throw error

      if (data) {
        setCategories([...categories, ...data as Category[]])
        setNewCatName('')
      }
    } catch (err) {
      alert('Erro ao criar categoria')
      console.error(err)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    
    if (!error) {
      setCategories(categories.filter(cat => cat.id !== id))
    } else {
        alert("Erro ao deletar. Verifique se não há produtos vinculados.")
    }
  }

  if (loading) return <div className="p-4 text-gray-500">Carregando categorias...</div>

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Gerenciar Categorias</h2>
      
      {/* Input para adicionar */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="Nova categoria (ex: Lanches)"
          className="flex-1 border border-gray-300 p-2 rounded focus:outline-none focus:border-yellow-500"
          onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
        />
        <button 
          onClick={handleAddCategory}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 font-semibold transition-colors"
        >
          Adicionar
        </button>
      </div>

      {/* Lista */}
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.id} className="flex justify-between items-center border-b border-gray-100 pb-2 p-2 hover:bg-gray-50 rounded">
            <span className="text-gray-700 font-medium">{cat.name}</span>
            <button 
              onClick={() => handleDelete(cat.id)}
              className="text-red-500 text-sm hover:text-red-700 transition-colors"
            >
              Excluir
            </button>
          </li>
        ))}
        {categories.length === 0 && !loading && (
            <li className="text-gray-400 italic text-center py-2">Nenhuma categoria cadastrada.</li>
        )}
      </ul>
    </div>
  )
}