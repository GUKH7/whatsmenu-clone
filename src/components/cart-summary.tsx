"use client"

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr' // Importação nova
import { X, Trash2, Send } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
}

interface CartItem {
  product: Product
  quantity: number
  observation: string
}

interface CartSummaryProps {
  isOpen: boolean
  onClose: () => void
  cart: CartItem[]
  onRemoveItem: (index: number) => void
  restaurantPhone?: string | null
  restaurantId?: string // Novo prop para saber de quem é o pedido
}

export default function CartSummary({ isOpen, onClose, cart, onRemoveItem, restaurantPhone, restaurantId }: CartSummaryProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Pix')
  const [isSending, setIsSending] = useState(false)

  if (!isOpen) return null

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const handleFinishOrder = async () => {
    if (!customerName || !address) {
      alert('Por favor, preencha seu nome e endereço.')
      return
    }

    setIsSending(true)

    try {
      // 1. SALVAR NO SUPABASE (A Mágica acontece aqui)
      if (restaurantId) {
        const { error } = await supabase.from('orders').insert({
          restaurant_id: restaurantId,
          customer_name: customerName,
          customer_phone: customerPhone,
          address: address,
          payment_method: paymentMethod,
          total: total,
          items: cart, // Salva o array do carrinho como JSON
          status: 'Pendente'
        })
        
        if (error) {
            console.error('Erro ao salvar pedido:', error)
            alert('Erro ao salvar pedido no sistema, mas vamos tentar enviar pro Zap.')
        }
      }

      // 2. Montar a mensagem do WhatsApp (Mantivemos igual)
      let message = `*NOVO PEDIDO - WhatsMenu* 🍔\n\n`
      message += `*Cliente:* ${customerName}\n`
      message += `*Telefone:* ${customerPhone}\n`
      message += `*Endereço:* ${address}\n`
      message += `*Pagamento:* ${paymentMethod}\n\n`
      message += `*-------------------------*\n`
      message += `*RESUMO DO PEDIDO:*\n\n`

      cart.forEach((item) => {
        message += `${item.quantity}x ${item.product.name}\n`
        if (item.observation) message += `   _Obs: ${item.observation}_\n`
        message += `   ${formatPrice(item.product.price * item.quantity)}\n\n`
      })

      message += `*-------------------------*\n`
      message += `*TOTAL: ${formatPrice(total)}*\n`

      const encodedMessage = encodeURIComponent(message)
      const phone = restaurantPhone || '5511999999999' 
      
      // 3. Redirecionar
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank')
      
      // Opcional: Limpar carrinho ou fechar modal
      onClose()
      
    } catch (error) {
      console.error(error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="relative bg-white w-full sm:max-w-lg h-[90vh] sm:h-auto sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up sm:animate-none">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Sua Sacola</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">Sua sacola está vazia.</div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{item.quantity}x</span>
                    <span className="text-gray-800">{item.product.name}</span>
                  </div>
                  {item.observation && (
                    <p className="text-sm text-gray-500 mt-1 ml-6">Obs: {item.observation}</p>
                  )}
                  <p className="text-sm font-semibold text-green-600 ml-6 mt-1">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
                <button onClick={() => onRemoveItem(index)} className="text-red-400 hover:text-red-600 p-2">
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}

          {/* Dados do Cliente */}
          {cart.length > 0 && (
            <div className="mt-6 space-y-3 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-700 text-sm uppercase">Dados para Entrega</h3>
              
              <input
                type="text" placeholder="Seu Nome"
                className="w-full border p-2 rounded outline-none focus:border-green-500"
                value={customerName} onChange={e => setCustomerName(e.target.value)}
              />
              
              <input
                type="text" placeholder="Seu Telefone / WhatsApp"
                className="w-full border p-2 rounded outline-none focus:border-green-500"
                value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
              />

              <textarea
                placeholder="Endereço Completo (Rua, Número, Bairro)"
                className="w-full border p-2 rounded outline-none focus:border-green-500 resize-none"
                rows={2}
                value={address} onChange={e => setAddress(e.target.value)}
              />

              <div className="flex gap-2">
                 <h3 className="font-bold text-gray-700 text-sm mt-2">Pagamento:</h3>
                 <select 
                   value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                   className="border p-1 rounded bg-white text-sm"
                 >
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Dinheiro">Dinheiro</option>
                 </select>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo */}
        {cart.length > 0 && (
            <div className="p-4 border-t bg-white">
                <div className="flex justify-between items-center mb-4 text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                </div>
                <button 
                    onClick={handleFinishOrder}
                    disabled={isSending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                >
                    {isSending ? 'Salvando...' : <><Send size={20} /> Enviar Pedido</>}
                </button>
            </div>
        )}
      </div>
    </div>
  )
}