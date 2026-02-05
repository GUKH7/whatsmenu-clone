"use client"

import { useState, useEffect } from 'react'
import { X, Minus, Plus } from 'lucide-react'

// --- CORREÇÃO AQUI: Adicionei category_id para bater com a página pai ---
interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  category_id: string 
}

interface ProductDetailsModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product, quantity: number, observation: string) => void
}

export default function ProductDetailsModal({ product, isOpen, onClose, onAddToCart }: ProductDetailsModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [observation, setObservation] = useState('')

  useEffect(() => {
    if (isOpen) {
      setQuantity(1)
      setObservation('')
    }
  }, [isOpen, product])

  if (!isOpen || !product) return null

  const total = product.price * quantity

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const handleSave = () => {
    onAddToCart(product, quantity, observation)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/80 p-2 rounded-full hover:bg-white shadow-sm transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>

        <div className="h-48 sm:h-56 bg-gray-100 flex-shrink-0">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200">
              Sem imagem
            </div>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
          <p className="text-gray-500 mb-6 leading-relaxed">{product.description}</p>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Alguma observação?
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none bg-gray-50"
              rows={3}
              placeholder="Ex: Tirar a cebola, maionese à parte..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-4">
          <div className="flex items-center border border-gray-200 rounded-lg h-12">
            <button 
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className={`px-3 h-full flex items-center justify-center ${quantity === 1 ? 'text-gray-300' : 'text-red-500'}`}
              disabled={quantity === 1}
            >
              <Minus size={20} />
            </button>
            <span className="w-8 text-center font-semibold text-gray-900">{quantity}</span>
            <button 
              onClick={() => setQuantity(q => q + 1)}
              className="px-3 h-full flex items-center justify-center text-red-500"
            >
              <Plus size={20} />
            </button>
          </div>

          <button 
            onClick={handleSave}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-lg flex justify-between items-center px-6 transition-colors"
          >
            <span>Adicionar</span>
            <span>{formatPrice(total)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}