"use client"

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trash2, Plus, Pencil, Check, X, Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface AdminCategoriesProps {
  restaurantId: string
}

export default function AdminCategories({ restaurantId }: AdminCategoriesProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(false)

  // Estados para Edição
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true }) // Ordem de criação
    
    if (data) setCategories(data)
  }

  const handleAdd = async () => {
    if (!newCategory.trim()) return
    setLoading(true)

    const { error } = await supabase
      .from('categories')
      .insert({ name: newCategory, restaurant_id: restaurantId })

    if (!error) {
      setNewCategory('')
      fetchCategories()
    } else {
      alert('Erro ao criar categoria.')
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza? Isso pode afetar produtos dessa categoria.')) {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) {
        alert('Não foi possível excluir. Verifique se há produtos usando esta categoria.')
      } else {
        fetchCategories()
      }
    }
  }

  // --- FUNÇÕES DE EDIÇÃO ---
  const startEditing = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName('')
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return

    const { error } = await supabase
      .from('categories')
      .update({ name: editName })
      .eq('id', id)

    if (!error) {
      setEditingId(null)
      fetchCategories()
    } else {
      alert('Erro ao atualizar nome.')
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Gerenciar Categorias</h2>

      {/* LISTA DE CATEGORIAS */}
      <div className="space-y-3 mb-6">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
            
            {/* SE ESTIVER EDITANDO... */}
            {editingId === cat.id ? (
                <div className="flex flex-1 items-center gap-2">
                    <input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 border border-blue-400 p-1 px-2 rounded bg-white text-sm"
                        autoFocus
                    />
                    <button onClick={() => saveEdit(cat.id)} className="p-1 text-green-600 hover:bg-green-100 rounded">
                        <Check size={18} />
                    </button>
                    <button onClick={cancelEditing} className="p-1 text-red-500 hover:bg-red-100 rounded">
                        <X size={18} />
                    </button>
                </div>
            ) : (
                /* SE ESTIVER APENAS MOSTRANDO... */
                <>
                    <span className="font-medium text-gray-700">{cat.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => startEditing(cat)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar nome"
                        >
                            <Pencil size={16} />
                        </button>
                        <button 
                            onClick={() => handleDelete(cat.id)}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir categoria"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </>
            )}
          </div>
        ))}

        {categories.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-2">Nenhuma categoria criada ainda.</p>
        )}
      </div>

      {/* CRIAR NOVA */}
      <div className="flex gap-2">
        <input 
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Nova categoria (ex: Lanches)"
          className="flex-1 border border-gray-300 p-2 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button 
          onClick={handleAdd}
          disabled={loading || !newCategory.trim()}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Adicionar'}
        </button>
      </div>
    </div>
  )
}