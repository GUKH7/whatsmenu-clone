"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Trash2, Edit2, Plus, GripVertical, Loader2 } from "lucide-react"

interface Category {
  id: string
  name: string
  order: number
}

interface AdminCategoriesProps {
  initialCategories: Category[]
  restaurantId: string
}

export default function AdminCategories({ initialCategories, restaurantId }: AdminCategoriesProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [newCategory, setNewCategory] = useState("")
  const [loading, setLoading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    setLoading(true)

    // Ocultamente, define a ordem como o último da lista
    const nextOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 1

    const { data, error } = await supabase
      .from('categories')
      .insert({ 
        name: newCategory, 
        restaurant_id: restaurantId,
        order: nextOrder
      })
      .select()
      .single()

    if (data) {
        setCategories([...categories, data])
        setNewCategory("")
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if(!confirm("Tem certeza? Isso pode apagar produtos dessa categoria!")) return;
    
    await supabase.from('categories').delete().eq('id', id)
    setCategories(categories.filter(c => c.id !== id))
  }

  // --- LÓGICA DE ARRASTAR E SOLTAR (DRAG AND DROP) ---
  
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault() // Necessário para permitir o drop
    if (draggedIndex === null || draggedIndex === index) return

    // Reordena visualmente o array enquanto arrasta
    const newCategories = [...categories]
    const draggedItem = newCategories[draggedIndex]
    
    // Remove o item da posição antiga
    newCategories.splice(draggedIndex, 1)
    // Insere na nova posição
    newCategories.splice(index, 0, draggedItem)

    setCategories(newCategories)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    setDraggedIndex(null)
    saveNewOrder()
  }

  const saveNewOrder = async () => {
    setIsSavingOrder(true)
    
    // Prepara as atualizações: cada categoria ganha um novo 'order' baseado no índice do array
    const updates = categories.map((cat, index) => ({
        id: cat.id,
        order: index + 1 // +1 porque SQL geralmente começa em 1, mas tanto faz
    }))

    // Envia pro Supabase um por um (ou faríamos um upsert em massa se fosse muita coisa)
    // Para simplificar e garantir segurança, vamos atualizar um loop
    for (const update of updates) {
        await supabase.from('categories').update({ order: update.order }).eq('id', update.id)
    }

    setIsSavingOrder(false)
    // Opcional: Mostrar um toast de sucesso
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Categorias do Cardápio</h2>
        <div className="flex items-center gap-2">
            {isSavingOrder && <span className="text-xs text-orange-500 font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Salvando ordem...</span>}
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{categories.length} categorias</span>
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((category, index) => (
          <div 
            key={category.id} 
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`group flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-lg transition-all cursor-move
                ${draggedIndex === index ? 'opacity-50 border-dashed border-red-300 bg-red-50' : 'hover:bg-white hover:shadow-md hover:border-red-100'}
            `}
          >
            <div className="flex items-center gap-3">
                <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600">
                    <GripVertical size={20} />
                </div>
                <span className="font-semibold text-gray-700">{category.name}</span>
            </div>
            
            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                    <Edit2 size={16} />
                </button>
                <button 
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <input 
            type="text" 
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nome da nova categoria (ex: Promoções)"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
        />
        <button 
            onClick={handleAddCategory}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
        >
            <Plus size={20} />
            {loading ? "..." : "Adicionar"}
        </button>
      </div>
    </div>
  )
}