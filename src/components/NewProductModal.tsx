"use client"

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X } from 'lucide-react' // Ícone de fechar

interface Category {
  id: string
  name: string
}

interface NewProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductCreated: () => void // Função para recarregar a lista lá no pai
  restaurantId: string
}

export default function NewProductModal({ isOpen, onClose, onProductCreated, restaurantId }: NewProductModalProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('') // Opcional: url da imagem
  const [categoryId, setCategoryId] = useState('')
  
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  // 1. Buscar categorias assim que o modal abre
  useEffect(() => {
    if (isOpen && restaurantId) {
      fetchCategories()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, restaurantId])

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .eq('restaurant_id', restaurantId)
      .order('order', { ascending: true })
    
    if (data) setCategories(data)
  }

  // 2. Salvar o Produto
  async function handleSave() {
    if (!name || !price || !categoryId) {
      alert('Preencha nome, preço e categoria!')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('products')
        .insert([
          {
            name,
            description,
            price: parseFloat(price),
            category_id: categoryId, // <--- O PULO DO GATO AQUI
            restaurant_id: restaurantId,
            image_url: imageUrl || null
          }
        ])

      if (error) throw error

      // Limpar formulário
      setName('')
      setDescription('')
      setPrice('')
      setCategoryId('')
      
      onProductCreated() // Avisa a página pai para atualizar
      onClose() // Fecha o modal

    } catch (error) {
      console.error(error)
      alert('Erro ao criar produto')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Novo Produto</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-4 space-y-4">
          
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none"
              placeholder="Ex: X-Salada"
            />
          </div>

          {/* Categoria (Dropdown) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none bg-white"
            >
              <option value="">Selecione uma categoria...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Crie categorias primeiro!</p>
            )}
          </div>

          {/* Preço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none"
              placeholder="0.00"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none"
              placeholder="Ingredientes, detalhes..."
            />
          </div>

        </div>

        {/* Rodapé / Botão */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Produto'}
          </button>
        </div>

      </div>
    </div>
  )
}