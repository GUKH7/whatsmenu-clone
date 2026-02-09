"use client"

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Save, Loader2, ArrowLeft, Plus, Trash2, Clock, MapPin, DollarSign, Minus } from 'lucide-react'
import Link from 'next/link'

// Definição do formato de cada linha da tabela
interface DeliveryTier {
  distance: number // Km
  time: number     // Minutos
  price: number    // Reais
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dados Básicos
  const [restaurantId, setRestaurantId] = useState('')
  const [name, setName] = useState('')
  
  // Dados de Entrega (Tabela)
  const [tiers, setTiers] = useState<DeliveryTier[]>([])

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data } = await supabase.from('restaurants').select('*').single()
    if (data) {
        setRestaurantId(data.id)
        setName(data.name)
        
        // Se já tiver faixas salvas, usa. Se não, cria um padrãozinho inicial.
        if (data.delivery_tiers && data.delivery_tiers.length > 0) {
            setTiers(data.delivery_tiers)
        } else {
            setTiers([
                { distance: 1, time: 20, price: 0 },
                { distance: 3, time: 30, price: 5 },
                { distance: 5, time: 45, price: 10 },
            ])
        }
    }
    setLoading(false)
  }

  // --- FUNÇÕES DE AJUSTE RÁPIDO (IGUAL IFOOD) ---
  const bulkAdjustTime = (amount: number) => {
    setTiers(prev => prev.map(t => ({ ...t, time: Math.max(0, t.time + amount) })))
  }

  const bulkAdjustPrice = (amount: number) => {
    setTiers(prev => prev.map(t => ({ ...t, price: Math.max(0, t.price + amount) })))
  }

  // --- FUNÇÕES DA TABELA ---
  const updateTier = (index: number, field: keyof DeliveryTier, value: string) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: parseFloat(value) || 0 }
    setTiers(newTiers)
  }

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1]
    setTiers([...tiers, { 
        distance: lastTier ? lastTier.distance + 1 : 1, 
        time: lastTier ? lastTier.time + 10 : 30, 
        price: lastTier ? lastTier.price + 2 : 5 
    }])
  }

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    // Ordena por distância antes de salvar para não bugar a lógica
    const sortedTiers = [...tiers].sort((a, b) => a.distance - b.distance)

    const { error } = await supabase
        .from('restaurants')
        .update({
            name,
            delivery_tiers: sortedTiers // Salva a tabela inteira
        })
        .eq('id', restaurantId)

    if (error) {
        alert('Erro ao salvar.')
    } else {
        alert('Configurações atualizadas! ✅')
        fetchSettings() // Recarrega para garantir
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-green-600"><Loader2 className="animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex items-center gap-4">
            <Link href="/admin">
                <button className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Configurações de Entrega</h1>
        </div>

        {/* Card Nome */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Loja</label>
            <input 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-gray-50"
            />
        </div>

        {/* --- ÁREA ESTILO IFOOD --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <MapPin className="text-red-500" size={20}/>
                    Raios de Entrega
                </h2>
                <p className="text-gray-500 text-sm mt-1">Configure o tempo e a taxa para cada distância.</p>
            </div>

            {/* Ajuste Rápido */}
            <div className="bg-gray-50 p-4 flex flex-wrap gap-4 items-center justify-between border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase">Ajuste Rápido</span>
                <div className="flex gap-2">
                    <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={() => bulkAdjustTime(-5)} className="px-3 py-1 hover:bg-gray-50 text-gray-600 border-r">- 5 min</button>
                        <button onClick={() => bulkAdjustTime(5)} className="px-3 py-1 hover:bg-gray-50 text-gray-600">+ 5 min</button>
                    </div>
                    <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={() => bulkAdjustPrice(-1)} className="px-3 py-1 hover:bg-gray-50 text-gray-600 border-r">- R$ 1</button>
                        <button onClick={() => bulkAdjustPrice(1)} className="px-3 py-1 hover:bg-gray-50 text-gray-600">+ R$ 1</button>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="p-4">
                <div className="grid grid-cols-10 gap-4 mb-2 px-2 text-xs font-bold text-gray-400 uppercase">
                    <div className="col-span-3">Raio (Até km)</div>
                    <div className="col-span-3">Tempo (min)</div>
                    <div className="col-span-3">Taxa (R$)</div>
                    <div className="col-span-1"></div>
                </div>

                <div className="space-y-3">
                    {tiers.map((tier, index) => (
                        <div key={index} className="grid grid-cols-10 gap-4 items-center bg-white border border-gray-200 p-2 rounded-lg hover:border-red-200 transition-colors shadow-sm">
                            
                            {/* Raio */}
                            <div className="col-span-3 relative">
                                <input 
                                    type="number" 
                                    value={tier.distance}
                                    onChange={(e) => updateTier(index, 'distance', e.target.value)}
                                    className="w-full pl-3 pr-8 py-2 border rounded focus:border-red-500 outline-none text-gray-800 font-medium"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">km</span>
                            </div>

                            {/* Tempo */}
                            <div className="col-span-3 relative">
                                <input 
                                    type="number" 
                                    value={tier.time}
                                    onChange={(e) => updateTier(index, 'time', e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 border rounded focus:border-red-500 outline-none text-gray-800"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">min</span>
                            </div>

                            {/* Taxa */}
                            <div className="col-span-3 relative">
                                <span className="absolute left-3 top-2.5 text-xs text-green-600 font-bold">R$</span>
                                <input 
                                    type="number" 
                                    value={tier.price}
                                    onChange={(e) => updateTier(index, 'price', e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 border rounded focus:border-red-500 outline-none text-gray-800 font-bold"
                                />
                            </div>

                            {/* Excluir */}
                            <div className="col-span-1 flex justify-center">
                                <button 
                                    onClick={() => removeTier(index)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={addTier}
                    className="mt-6 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Adicionar Nova Faixa
                </button>
            </div>
        </div>

        <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
            {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Alterações</>}
        </button>

      </div>
    </div>
  )
}