"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Clock, ChefHat, Bike, CheckCircle, MapPin, DollarSign, Package, AlertCircle } from "lucide-react"

// Tipos
interface Order {
  id: string
  customer_name: string
  customer_phone: string
  total: number
  status: 'pending' | 'preparing' | 'delivering' | 'done' | 'canceled'
  payment_method: string
  created_at: string
  address: any
  items?: any[]
  change_for?: string
}

// Configuração das Abas (Status)
const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendentes', countColor: 'bg-yellow-500' },
  { id: 'preparing', label: 'Em Preparo', countColor: 'bg-orange-500' },
  { id: 'delivering', label: 'Em Entrega', countColor: 'bg-blue-500' },
  { id: 'done', label: 'Concluídos', countColor: 'bg-green-500' },
]

export default function OrdersPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending') // Começa na aba Pendentes

  useEffect(() => {
    fetchOrders()
    subscribeToOrders()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push("/admin/login")

    const { data: resto } = await supabase.from('restaurants').select('id').single()
    if (!resto) return

    const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('restaurant_id', resto.id)
        .neq('status', 'canceled')
        .order('created_at', { ascending: false })

    if (data) setOrders(data)
    setLoading(false)
  }

  const subscribeToOrders = () => {
    const subscription = supabase
      .channel('orders-list-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders() 
      })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }

  const updateStatus = async (orderId: string, newStatus: string) => {
    // Atualização Otimista
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o))
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  // Filtra os pedidos com base na aba ativa
  const filteredOrders = orders.filter(o => activeTab === 'all' ? true : o.status === activeTab)

  // Contadores para as bolinhas das abas
  const getCount = (status: string) => orders.filter(o => o.status === status).length

  const formatPrice = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Carregando pedidos...</div>

  return (
    <div className="max-w-5xl mx-auto pb-20">
      
      {/* Cabeçalho */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestor de Pedidos</h1>
            <p className="text-gray-500 text-sm">Acompanhe seus pedidos em tempo real</p>
          </div>
          <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 border border-green-200">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             Loja Aberta
          </div>
      </div>

      {/* Abas de Navegação */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 mb-6 pb-1">
          {TABS.map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                      relative px-6 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-lg border-b-2
                      ${activeTab === tab.id 
                          ? 'text-red-600 border-red-600 bg-red-50' 
                          : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'}
                  `}
              >
                  <div className="flex items-center gap-2">
                      {tab.label}
                      {tab.id !== 'all' && getCount(tab.id) > 0 && (
                          <span className={`text-[10px] text-white px-2 py-0.5 rounded-full ${tab.countColor}`}>
                              {getCount(tab.id)}
                          </span>
                      )}
                  </div>
              </button>
          ))}
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-4">
          {filteredOrders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
                  <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Nenhum pedido nesta aba.</p>
              </div>
          ) : (
              filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                      
                      {/* HEADER DO CARD */}
                      <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <span className="font-bold text-gray-800 text-lg">#{order.id.slice(0, 4)}</span>
                              <span className="text-gray-400">|</span>
                              <span className="font-bold text-gray-700">{order.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-full border border-gray-200">
                              <Clock size={14} /> {formatTime(order.created_at)}
                          </div>
                      </div>

                      <div className="p-6 flex flex-col md:flex-row gap-6">
                          
                          {/* ESQUERDA: ITENS */}
                          <div className="flex-1 space-y-3">
                              {order.items?.map((item: any, i) => (
                                  <div key={i} className="flex items-start gap-3 text-sm">
                                      <span className="font-bold text-gray-500 border border-gray-200 px-2 rounded bg-gray-50">{item.quantity}x</span>
                                      <div>
                                          <p className="text-gray-800 font-medium">{item.product_name}</p>
                                          {item.addons && Array.isArray(item.addons) && item.addons.length > 0 && (
                                              <p className="text-xs text-gray-500 mt-1">
                                                  + {item.addons.map((g: any) => g.options.map((o: any) => o.name).join(', ')).join(', ')}
                                              </p>
                                          )}
                                          {item.observation && (
                                              <p className="text-xs text-orange-600 font-bold mt-1 bg-orange-50 px-2 py-0.5 rounded inline-block">
                                                  Obs: {item.observation}
                                              </p>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>

                          {/* MEIO: ENDEREÇO E PAGAMENTO */}
                          <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 space-y-4">
                              <div className="flex gap-3">
                                  <div className="bg-gray-100 p-2 rounded-full h-fit"><MapPin size={16} className="text-gray-500"/></div>
                                  <div>
                                      <p className="text-xs font-bold text-gray-400 uppercase">Entrega</p>
                                      {order.address ? (
                                          <p className="text-sm text-gray-700 leading-tight">
                                              {order.address.street}, {order.address.number}<br/>
                                              {order.address.neighborhood}
                                          </p>
                                      ) : (
                                          <p className="text-sm text-gray-500">Retirada no Balcão</p>
                                      )}
                                  </div>
                              </div>

                              <div className="flex gap-3">
                                  <div className="bg-green-100 p-2 rounded-full h-fit"><DollarSign size={16} className="text-green-600"/></div>
                                  <div>
                                      <p className="text-xs font-bold text-gray-400 uppercase">Pagamento ({order.payment_method})</p>
                                      <p className="text-lg font-bold text-gray-800">{formatPrice(order.total)}</p>
                                      {order.change_for && <p className="text-xs text-red-500 font-bold">Troco para: {order.change_for}</p>}
                                  </div>
                              </div>
                          </div>

                          {/* DIREITA: AÇÕES */}
                          <div className="md:w-48 flex flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                              {order.status === 'pending' && (
                                  <>
                                      <button 
                                          onClick={() => updateStatus(order.id, 'preparing')}
                                          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                                      >
                                          ACEITAR
                                      </button>
                                      <button 
                                          onClick={() => { if(confirm('Rejeitar pedido?')) updateStatus(order.id, 'canceled') }}
                                          className="w-full py-2 text-gray-500 hover:bg-gray-100 font-bold rounded-lg text-sm transition-colors"
                                      >
                                          Rejeitar
                                      </button>
                                  </>
                              )}

                              {order.status === 'preparing' && (
                                  <button 
                                      onClick={() => updateStatus(order.id, 'delivering')}
                                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                                  >
                                      <Bike size={18} /> DESPACHAR
                                  </button>
                              )}

                              {order.status === 'delivering' && (
                                  <button 
                                      onClick={() => updateStatus(order.id, 'done')}
                                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                                  >
                                      <CheckCircle size={18} /> CONCLUIR
                                  </button>
                              )}
                              
                              {order.status === 'done' && (
                                  <div className="text-center p-2 bg-green-50 text-green-700 font-bold rounded-lg text-sm border border-green-100">
                                      Pedido Finalizado
                                  </div>
                              )}
                          </div>

                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  )
}