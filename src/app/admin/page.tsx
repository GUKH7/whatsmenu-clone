"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { DollarSign, ShoppingBag, TrendingUp, Calendar, Loader2, Award } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
      todaySales: 0,
      todayOrders: 0,
      monthSales: 0,
      monthOrders: 0
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push("/admin/login")

    const { data: resto } = await supabase.from('restaurants').select('id').single()
    if (!resto) return

    // 1. Busca Pedidos (Últimos 30 dias para métricas e gráfico)
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(today.getDate() - 30)

    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', resto.id)
        .neq('status', 'canceled')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true })

    if (orders) {
        processOrderStats(orders)
    }

    // 2. Busca Produtos Mais Vendidos
    const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity, orders!inner(restaurant_id, status)') // Join com orders
        .eq('orders.restaurant_id', resto.id)
        .neq('orders.status', 'canceled')
    
    if (items) {
        processTopProducts(items)
    }

    setLoading(false)
  }

  const processOrderStats = (orders: any[]) => {
      const todayStr = new Date().toLocaleDateString('pt-BR')
      let tSales = 0, tOrders = 0, mSales = 0, mOrders = 0
      
      // Agrupamento para o Gráfico (Últimos 7 dias)
      const last7DaysMap: Record<string, number> = {}
      for(let i=6; i>=0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          last7DaysMap[d.toLocaleDateString('pt-BR').slice(0,5)] = 0 // Inicializa ex: "10/02"
      }

      orders.forEach(order => {
          const orderDate = new Date(order.created_at)
          const dateStr = orderDate.toLocaleDateString('pt-BR')
          const shortDate = dateStr.slice(0, 5) // "dd/mm"

          // Métricas Totais
          mSales += order.total
          mOrders += 1

          // Métricas de Hoje
          if (dateStr === todayStr) {
              tSales += order.total
              tOrders += 1
          }

          // Dados do Gráfico
          if (last7DaysMap[shortDate] !== undefined) {
              last7DaysMap[shortDate] += order.total
          }
      })

      setStats({ todaySales: tSales, todayOrders: tOrders, monthSales: mSales, monthOrders: mOrders })
      
      // Formata array pro Recharts
      const chart = Object.keys(last7DaysMap).map(key => ({
          name: key,
          vendas: last7DaysMap[key]
      }))
      setChartData(chart)
  }

  const processTopProducts = (items: any[]) => {
      const productMap: Record<string, number> = {}
      items.forEach(item => {
          if (!productMap[item.product_name]) productMap[item.product_name] = 0
          productMap[item.product_name] += item.quantity
      })

      const sorted = Object.entries(productMap)
          .sort((a, b) => b[1] - a[1]) // Ordena decrescente
          .slice(0, 5) // Pega top 5
          .map(([name, qtd]) => ({ name, qtd }))
      
      setTopProducts(sorted)
  }

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600"/></div>

  return (
    <div className="max-w-6xl mx-auto pb-20">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><TrendingUp className="text-red-600"/> Visão Geral</h1>

        {/* CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-700 rounded-xl"><DollarSign size={24}/></div>
                <div><p className="text-sm text-gray-500 font-medium">Vendas Hoje</p><p className="text-2xl font-black text-gray-800">{formatMoney(stats.todaySales)}</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-xl"><ShoppingBag size={24}/></div>
                <div><p className="text-sm text-gray-500 font-medium">Pedidos Hoje</p><p className="text-2xl font-black text-gray-800">{stats.todayOrders}</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-orange-100 text-orange-700 rounded-xl"><Calendar size={24}/></div>
                <div><p className="text-sm text-gray-500 font-medium">Faturamento Mês</p><p className="text-2xl font-black text-gray-800">{formatMoney(stats.monthSales)}</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-700 rounded-xl"><ShoppingBag size={24}/></div>
                <div><p className="text-sm text-gray-500 font-medium">Pedidos Mês</p><p className="text-2xl font-black text-gray-800">{stats.monthOrders}</p></div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* GRÁFICO DE VENDAS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
                <h3 className="font-bold text-gray-800 mb-6">Vendas (Últimos 7 dias)</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10}/>
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(val) => `R$${val}`}/>
                            <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}/>
                            <Bar dataKey="vendas" fill="#DC2626" radius={[4, 4, 0, 0]} barSize={40}/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* TOP PRODUTOS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Award className="text-yellow-500"/> Campeões de Venda</h3>
                <div className="space-y-4">
                    {topProducts.length === 0 && <p className="text-gray-400 text-sm">Sem dados suficientes.</p>}
                    {topProducts.map((prod, i) => (
                        <div key={i} className="flex justify-between items-center pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <span className={`font-bold text-sm w-6 h-6 flex items-center justify-center rounded-full ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {i + 1}
                                </span>
                                <span className="text-sm font-medium text-gray-700">{prod.name}</span>
                            </div>
                            <span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded-full">{prod.qtd} un</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    </div>
  )
}