"use client"

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ArrowLeft, Clock, CheckCircle, XCircle, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'

interface Order {
  id: string
  created_at: string
  customer_name: string
  customer_phone: string
  address: string
  total: number
  status: string
  payment_method: string
  items: any[]
}

export default function AdminOrders() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
    
    // Configura um "Auto-Refresh" a cada 30 segundos
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchOrders() {
    // 1. Pega o usuário logado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 2. Pega o ID do restaurante desse usuário
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (restaurant) {
        // 3. Busca os pedidos desse restaurante
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('created_at', { ascending: false }) // Mais recentes primeiro
        
        if (data) setOrders(data)
    }
    setLoading(false)
  }

  async function updateStatus(orderId: string, newStatus: string) {
    const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
    
    if (!error) {
        fetchOrders() // Atualiza a lista na hora
    }
  }

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Topo */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Link href="/admin" className="p-2 bg-white rounded-full hover:bg-gray-100 shadow-sm transition">
                    <ArrowLeft size={20} className="text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-800">Pedidos Recebidos</h1>
            </div>
            <button 
                onClick={fetchOrders} 
                className="text-sm text-green-600 font-bold hover:underline"
            >
                Atualizar Lista
            </button>
        </div>

        {loading ? (
            <div className="text-center py-20 text-gray-500">Carregando pedidos...</div>
        ) : orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                <p className="text-gray-500 text-lg">Nenhum pedido recebido ainda.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        
                        {/* Cabeçalho do Card */}
                        <div className={`p-4 border-b flex justify-between items-center ${
                            order.status === 'Pendente' ? 'bg-yellow-50' : 
                            order.status === 'Concluído' ? 'bg-green-50' : 'bg-gray-50'
                        }`}>
                            <span className="font-bold text-gray-700">#{order.id.slice(0,5)}</span>
                            <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                                <Clock size={14} /> {formatDate(order.created_at)}
                            </div>
                        </div>

                        {/* Corpo */}
                        <div className="p-4 flex-1">
                            <div className="mb-4">
                                <h3 className="font-bold text-lg text-gray-900">{order.customer_name}</h3>
                                <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                    <Phone size={14} /> {order.customer_phone}
                                </div>
                                <div className="text-sm text-gray-500 flex items-start gap-1 mt-1">
                                    <MapPin size={14} className="mt-0.5" /> {order.address}
                                </div>
                            </div>

                            <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg text-sm">
                                {order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{item.quantity}x {item.product.name}</span>
                                        <span className="font-medium text-gray-600">
                                            {formatPrice(item.product.price * item.quantity)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center font-bold text-gray-900 border-t pt-3">
                                <span>Total ({order.payment_method})</span>
                                <span className="text-lg text-green-600">{formatPrice(order.total)}</span>
                            </div>
                        </div>

                        {/* Ações */}
                        <div className="p-3 bg-gray-50 border-t flex gap-2">
                            {order.status !== 'Concluído' && order.status !== 'Cancelado' && (
                                <>
                                    <button 
                                        onClick={() => updateStatus(order.id, 'Cancelado')}
                                        className="flex-1 py-2 text-red-600 font-bold text-sm hover:bg-red-50 rounded transition flex items-center justify-center gap-1"
                                    >
                                        <XCircle size={16} /> Cancelar
                                    </button>
                                    <button 
                                        onClick={() => updateStatus(order.id, 'Concluído')}
                                        className="flex-1 py-2 bg-green-600 text-white font-bold text-sm hover:bg-green-700 rounded transition flex items-center justify-center gap-1"
                                    >
                                        <CheckCircle size={16} /> Concluir
                                    </button>
                                </>
                            )}
                            {(order.status === 'Concluído' || order.status === 'Cancelado') && (
                                <div className={`w-full text-center font-bold text-sm py-2 ${
                                    order.status === 'Concluído' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    Pedido {order.status}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  )
}