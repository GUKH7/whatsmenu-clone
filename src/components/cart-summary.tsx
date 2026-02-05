"use client"

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, Trash2, Send, MapPin, Loader2, Search } from 'lucide-react'
import { calculateDistance, calculateTime } from '../utils/distance'

// ... (Interfaces Product e CartItem continuam iguais) ...
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
  restaurantId?: string
  restaurantLat?: number
  restaurantLng?: number
  pricePerKm?: number
  baseTime?: number
}

export default function CartSummary({ 
    isOpen, onClose, cart, onRemoveItem, 
    restaurantPhone, restaurantId,
    restaurantLat, restaurantLng, pricePerKm = 2, baseTime = 30 
}: CartSummaryProps) {
    
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Pix')
  const [isSending, setIsSending] = useState(false)

  // Estados de Entrega
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [distance, setDistance] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(0)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  if (!isOpen) return null

  const itemsTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
  const finalTotal = itemsTotal + deliveryFee

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  // --- FUNÇÃO 1: USAR GPS DO CELULAR ---
  const handleUseGPS = () => {
    if (!restaurantLat || !restaurantLng) {
        alert("Localização da loja não configurada.")
        return
    }
    setIsLocating(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords
            calculateFee(latitude, longitude)
            setAddress(`Minha Localização GPS (Lat: ${latitude.toFixed(4)})`)
            setIsLocating(false)
        },
        () => {
            setLocationError('Permissão negada. Digite seu endereço e clique na lupa.')
            setIsLocating(false)
        }
    )
  }

  // --- FUNÇÃO 2: BUSCAR ENDEREÇO ESCRITO (GRÁTIS) ---
  const handleSearchAddress = async () => {
    if (!address || address.length < 5) {
        setLocationError('Digite o endereço completo para calcular.')
        return
    }
    if (!restaurantLat || !restaurantLng) return

    setIsLocating(true)
    setLocationError('')

    try {
        // Usa a API gratuita do OpenStreetMap (Nominatim)
        const query = encodeURIComponent(address) 
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`)
        const data = await response.json()

        if (data && data.length > 0) {
            const userLat = parseFloat(data[0].lat)
            const userLng = parseFloat(data[0].lon)
            
            // Sucesso! Temos as coordenadas
            calculateFee(userLat, userLng)
        } else {
            setLocationError('Endereço não encontrado. Tente adicionar cidade/bairro.')
            setDeliveryFee(0)
            setDistance(0)
        }
    } catch (error) {
        setLocationError('Erro ao buscar endereço. Combine a taxa no WhatsApp.')
    } finally {
        setIsLocating(false)
    }
  }

  // Função Auxiliar que faz a conta
  const calculateFee = (userLat: number, userLng: number) => {
    if (!restaurantLat || !restaurantLng) return

    const dist = calculateDistance(restaurantLat, restaurantLng, userLat, userLng)
    setDistance(dist)

    // Regra de Negócio: Taxa mínima de R$ 2,00
    const fee = Math.max(2, dist * pricePerKm)
    setDeliveryFee(fee)

    const time = calculateTime(baseTime, dist)
    setEstimatedTime(time)
  }

  const handleFinishOrder = async () => {
    if (!customerName || !address) {
      alert('Preencha nome e endereço.')
      return
    }
    setIsSending(true)

    let message = `*NOVO PEDIDO* 🍔\n\n`
    message += `*Cliente:* ${customerName}\n`
    message += `*Tel:* ${customerPhone}\n`
    message += `*Endereço:* ${address}\n`
    
    if (distance > 0) {
        message += `*(Entrega: ${distance.toFixed(1)}km - ${formatPrice(deliveryFee)})*\n`
    } else {
        message += `*(Taxa de entrega a combinar)*\n`
    }
    
    message += `*Pagamento:* ${paymentMethod}\n\n`
    message += `*RESUMO:*\n`
    
    cart.forEach((item) => {
      message += `${item.quantity}x ${item.product.name}\n`
      if (item.observation) message += `   Obs: ${item.observation}\n`
    })
    
    message += `\n*Total Produtos:* ${formatPrice(itemsTotal)}\n`
    message += `*Taxa:* ${formatPrice(deliveryFee)}\n`
    message += `*TOTAL FINAL: ${formatPrice(finalTotal)}*\n`

    if (restaurantId) {
        await supabase.from('orders').insert({
          restaurant_id: restaurantId,
          customer_name: customerName,
          customer_phone: customerPhone,
          address: address,
          payment_method: paymentMethod,
          total: finalTotal,
          items: cart,
          status: 'Pendente'
        })
    }

    const encodedMessage = encodeURIComponent(message)
    const phone = restaurantPhone || '5511999999999' 
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank')
    setIsSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* AQUI ESTÁ A CORREÇÃO: sm:max-h-[85vh] em vez de sm:h-auto */}
      <div className="relative bg-white w-full sm:max-w-lg h-[90vh] sm:max-h-[85vh] sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up sm:animate-none">
        
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Finalizar Pedido</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Lista de Itens */}
          {cart.map((item, index) => (
             <div key={index} className="flex justify-between items-start border-b border-gray-100 pb-3">
               <div className="flex gap-2">
                 <span className="font-bold">{item.quantity}x</span>
                 <span>{item.product.name}</span>
               </div>
               <span className="font-semibold">{formatPrice(item.product.price * item.quantity)}</span>
               <button onClick={() => onRemoveItem(index)}><Trash2 size={16} className="text-red-400"/></button>
             </div>
          ))}

          {/* FORMULÁRIO */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
             <h3 className="font-bold text-gray-700 text-sm">Seus Dados</h3>
             <input type="text" placeholder="Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full border p-2 rounded" />
             <input type="text" placeholder="Telefone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full border p-2 rounded" />
             
             {/* ÁREA DE ENDEREÇO INTELIGENTE */}
             <div className="pt-2">
                <label className="text-sm font-bold text-gray-700 block mb-1">Endereço de Entrega</label>
                
                <div className="flex gap-2 mb-2">
                    <textarea 
                        value={address} 
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Ex: Rua das Flores, 123, Centro, Suzano"
                        className="flex-1 border p-2 rounded resize-none text-sm"
                        rows={2}
                    />
                    <div className="flex flex-col gap-1">
                        {/* Botão Lupa (Pesquisar Texto) */}
                        <button 
                            onClick={handleSearchAddress}
                            className="bg-blue-600 text-white p-2 rounded flex items-center justify-center hover:bg-blue-700 transition"
                            title="Calcular pelo endereço escrito"
                            disabled={isLocating}
                        >
                            {isLocating ? <Loader2 size={18} className="animate-spin"/> : <Search size={18}/>}
                        </button>
                        
                        {/* Botão GPS */}
                        <button 
                            onClick={handleUseGPS}
                            className="bg-green-600 text-white p-2 rounded flex items-center justify-center hover:bg-green-700 transition"
                            title="Usar minha localização atual (GPS)"
                            disabled={isLocating}
                        >
                            <MapPin size={18}/>
                        </button>
                    </div>
                </div>
                
                {locationError && <p className="text-xs text-red-500">{locationError}</p>}
                
                <p className="text-xs text-gray-400">
                    *Digite o endereço e clique na lupa ou use o GPS para calcular a taxa.
                </p>

                {/* RESULTADO DA TAXA */}
                {distance > 0 && (
                    <div className="mt-2 bg-white border border-green-200 p-3 rounded-lg shadow-sm flex justify-between items-center animate-pulse-slow">
                        <div>
                            <p className="text-green-800 font-bold text-sm">Entrega Calculada ({distance.toFixed(1)}km)</p>
                            <p className="text-gray-500 text-xs">Chega em ~{estimatedTime} min</p>
                        </div>
                        <div className="text-lg font-bold text-green-700">
                            + {formatPrice(deliveryFee)}
                        </div>
                    </div>
                )}
             </div>

             <div className="mt-2">
                <label className="text-sm font-bold text-gray-700">Pagamento</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white">
                    <option value="Pix">Pix</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Dinheiro">Dinheiro</option>
                </select>
             </div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="p-4 border-t bg-white">
            <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Total com Entrega</span>
                <span className="text-2xl font-bold text-gray-900">{formatPrice(finalTotal)}</span>
            </div>
            <button 
                onClick={handleFinishOrder}
                disabled={isSending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
                {isSending ? 'Enviando...' : <><Send size={20} /> Enviar Pedido</>}
            </button>
        </div>
      </div>
    </div>
  )
}