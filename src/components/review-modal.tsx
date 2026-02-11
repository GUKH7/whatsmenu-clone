"use client"

import { useState } from "react"
import { Star, X, Loader2, Send } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  restaurantId: string
  onReviewSubmitted: () => void
  primaryColor?: string
}

export default function ReviewModal({ isOpen, onClose, orderId, restaurantId, onReviewSubmitted, primaryColor = '#DC2626' }: ReviewModalProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (rating === 0) return alert("Por favor, selecione uma nota de 1 a 5 estrelas.")
    
    setSubmitting(true)
    try {
        const { error } = await supabase.from('reviews').insert({
            order_id: orderId,
            restaurant_id: restaurantId,
            rating,
            comment
        })

        if (error) throw error
        
        // Marca o pedido como avaliado (opcional, requer coluna na tabela orders)
        await supabase.from('orders').update({ status: 'done' }).eq('id', orderId) // Exemplo

        onReviewSubmitted()
        onClose()
        alert("Obrigado pela avaliação! ⭐")
    } catch (error) {
        console.error(error)
        alert("Erro ao enviar avaliação.")
    } finally {
        setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800">Avaliar Pedido</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>

        <div className="p-6 flex flex-col items-center">
            <p className="text-gray-600 text-sm mb-4 text-center">Como foi sua experiência com este pedido?</p>
            
            {/* Estrelas */}
            <div className="flex gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                    >
                        <Star 
                            size={32} 
                            fill={(hoverRating || rating) >= star ? "#EAB308" : "none"} 
                            className={(hoverRating || rating) >= star ? "text-yellow-500" : "text-gray-300"}
                        />
                    </button>
                ))}
            </div>

            <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Deixe um comentário (opcional)..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-yellow-500 min-h-[100px] mb-4 resize-none"
            />

            <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
            >
                {submitting ? <Loader2 className="animate-spin" size={20}/> : <Send size={18}/>} Enviar Avaliação
            </button>
        </div>
      </div>
    </div>
  )
}