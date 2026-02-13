"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { 
  Search, Calendar, Download, Eye, Loader2, 
  History as HistoryIcon, MapPin, ShoppingBag, X, CheckCircle, AlertCircle
} from "lucide-react"

type OrderStatus = 'all' | 'pending' | 'preparing' | 'done' | 'canceled'

export default function HistoryPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('') // YYYY-MM-DD
  
  // Modal de Detalhes
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  useEffect(() => {
    fetchOrders()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFilter])

  const fetchOrders = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/admin/login')

    const { data: resto } = await supabase.from('restaurants').select('id').single()
    if (!resto) return

    let query = supabase
      .from('orders')
      .select('*, order_items (*)')
      .eq('restaurant_id', resto.id)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)

    if (dateFilter) {
        const start = new Date(dateFilter + 'T00:00:00').toISOString()
        const end = new Date(dateFilter + 'T23:59:59').toISOString()
        query = query.gte('created_at', start).lte('created_at', end)
    }

    const { data, error } = await query
    if (!error && data) setOrders(data)
    setLoading(false)
  }

  // 1. Filtra localmente
  const filteredOrders = orders.filter(order => {
      const search = searchTerm.toLowerCase()
      const idMatch = order.id.toLowerCase().includes(search)
      const nameMatch = order.customer_name?.toLowerCase().includes(search)
      return idMatch || nameMatch
  })

  // 2. AGRUPAMENTO POR DATA (Lógica Estilo iFood)
  const groupedOrders = filteredOrders.reduce((acc, order) => {
      const d = new Date(order.created_at)
      // Cria uma chave no formato YYYY-MM-DD baseada no fuso local
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      
      if (!acc[dateKey]) {
          acc[dateKey] = { orders: [], totalValue: 0, count: 0 }
      }
      acc[dateKey].orders.push(order)
      acc[dateKey].totalValue += order.total
      acc[dateKey].count += 1
      return acc
  }, {} as Record<string, { orders: any[], totalValue: number, count: number }>)

  // Ordena as chaves (datas mais recentes primeiro)
  const sortedDateKeys = Object.keys(groupedOrders).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // Formatação de Datas e Valores
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const formatTime = (dateStr: string) => {
      const d = new Date(dateStr)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const getGroupLabel = (dateKey: string) => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

      if (dateKey === todayKey) return 'Hoje'
      if (dateKey === yesterdayKey) return 'Ontem'

      // Se for mais antigo, mostra "Dia de Mês"
      const d = new Date(dateKey + 'T00:00:00')
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
  }

  const getStatusStyle = (status: string) => {
      switch(status) {
          case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
          case 'preparing': return 'bg-blue-100 text-blue-700 border-blue-200'
          case 'done': return 'bg-green-100 text-green-700 border-green-200'
          case 'canceled': return 'bg-red-100 text-red-700 border-red-200'
          default: return 'bg-gray-100 text-gray-700 border-gray-200'
      }
  }

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'pending': return 'Em Aberto'
          case 'preparing': return 'Em Preparo'
          case 'done': return 'Concluído'
          case 'canceled': return 'Cancelado'
          default: return status
      }
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <HistoryIcon className="text-red-600"/> Histórico de Pedidos
            </h1>
            <p className="text-gray-500 text-sm mt-1">Consulte os pedidos passados da sua loja.</p>
        </div>
        <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm">
            <Download size={16}/> Exportar
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20}/>
                  <input 
                      type="text" 
                      placeholder="Digite o nome do cliente ou número do pedido" 
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 bg-gray-50"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="w-full md:w-48 relative">
                  <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                  <input 
                      type="date" 
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 text-gray-600 cursor-pointer"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                  />
              </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {[
                  { id: 'all', label: 'Todos' },
                  { id: 'pending', label: 'Em aberto' },
                  { id: 'preparing', label: 'Em preparo' },
                  { id: 'done', label: 'Concluídos' },
                  { id: 'canceled', label: 'Cancelados' }
              ].map(status => (
                  <button 
                      key={status.id}
                      onClick={() => setStatusFilter(status.id as OrderStatus)}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
                          statusFilter === status.id 
                          ? 'bg-gray-800 text-white border-gray-800 shadow-md' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                      {status.label}
                  </button>
              ))}
          </div>
      </div>

      {/* TABELA AGRUPADA ESTILO IFOOD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" size={32}/></div>
          ) : sortedDateKeys.length === 0 ? (
              <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                  <Search size={48} className="text-gray-200 mb-4"/>
                  <p>Nenhum pedido encontrado.</p>
              </div>
          ) : (
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-white text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                              <th className="p-4 w-24">Horário</th>
                              <th className="p-4">Pedido</th>
                              <th className="p-4">Cliente</th>
                              <th className="p-4">Situação</th>
                              <th className="p-4 text-right">Valor Líquido</th>
                              <th className="p-4 text-center">Detalhes</th>
                          </tr>
                      </thead>
                      
                      {/* MAPEANDO OS GRUPOS (Hoje, Ontem, etc) */}
                      {sortedDateKeys.map((dateKey) => {
                          const group = groupedOrders[dateKey]
                          return (
                              <tbody key={dateKey} className="border-b-[8px] border-gray-50/50">
                                  {/* CABEÇALHO DO DIA */}
                                  <tr className="bg-gray-50/80 border-b border-gray-100">
                                      <td colSpan={6} className="px-4 py-3 text-sm">
                                          <span className="font-bold text-gray-900">{getGroupLabel(dateKey)}</span>
                                          <span className="text-gray-500 ml-2">
                                              {group.count} {group.count === 1 ? 'pedido' : 'pedidos'} • Valor das vendas de <span className="font-medium">{formatCurrency(group.totalValue)}</span>
                                          </span>
                                      </td>
                                  </tr>
                                  
                                  {/* PEDIDOS DAQUELE DIA */}
                                  {group.orders.map((order: any) => (
                                      <tr key={order.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 text-sm">
                                          <td className="p-4 text-gray-600 font-medium">
                                              {formatTime(order.created_at)}
                                          </td>
                                          <td className="p-4 font-mono text-gray-500">
                                              #{order.id.slice(0, 4)}
                                          </td>
                                          <td className="p-4 font-medium text-gray-800">
                                              {order.customer_name || "Cliente sem nome"}
                                          </td>
                                          <td className="p-4">
                                              <span className={`px-2 py-1 rounded-md text-xs font-bold flex w-fit items-center gap-1 border ${getStatusStyle(order.status)}`}>
                                                  {getStatusLabel(order.status)}
                                              </span>
                                          </td>
                                          <td className="p-4 text-right font-bold text-gray-900">
                                              {formatCurrency(order.total)}
                                          </td>
                                          <td className="p-4 text-center">
                                              <button 
                                                  onClick={() => setSelectedOrder(order)}
                                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-all inline-flex shadow-sm"
                                              >
                                                  <Eye size={16}/>
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          )
                      })}
                  </table>
              </div>
          )}
      </div>

      {/* MODAL DE DETALHES DO PEDIDO */}
      {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                      <div>
                          <h2 className="font-bold text-gray-800 text-lg">Pedido #{selectedOrder.id.slice(0, 4)}</h2>
                          <p className="text-xs text-gray-500">{new Date(selectedOrder.created_at).toLocaleDateString('pt-BR')} às {formatTime(selectedOrder.created_at)}</p>
                      </div>
                      <button onClick={() => setSelectedOrder(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                          <div>
                              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Cliente</p>
                              <p className="font-medium text-gray-800">{selectedOrder.customer_name}</p>
                              <p className="text-sm text-gray-600">{selectedOrder.customer_phone}</p>
                          </div>
                          {selectedOrder.customer_address && (
                              <div className="pt-3 border-t border-gray-200">
                                  <p className="text-xs text-gray-500 font-bold uppercase mb-1 flex items-center gap-1"><MapPin size={12}/> Endereço</p>
                                  <p className="text-sm text-gray-700">{selectedOrder.customer_address}</p>
                              </div>
                          )}
                      </div>

                      <div>
                          <p className="text-xs text-gray-500 font-bold uppercase mb-3 flex items-center gap-1"><ShoppingBag size={12}/> Itens do Pedido</p>
                          <div className="space-y-3">
                              {selectedOrder.order_items?.map((item: any, i: number) => (
                                  <div key={i} className="flex justify-between items-start border-b border-gray-50 pb-3">
                                      <div className="flex gap-3">
                                          <span className="font-bold text-gray-800">{item.quantity}x</span>
                                          <div>
                                              <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                                          </div>
                                      </div>
                                      <span className="text-sm font-bold text-gray-600">{formatCurrency(item.price * item.quantity)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded-xl shadow-inner">
                          <span className="font-bold">Total Pago</span>
                          <span className="text-xl font-black text-green-400">{formatCurrency(selectedOrder.total)}</span>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}