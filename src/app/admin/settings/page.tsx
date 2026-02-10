"use client"

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Plus, Trash2, Clock, MapPin, Store, Phone } from 'lucide-react'

// ... (INTERFACES E CONSTANTES IGUAIS) ...
interface DeliveryTier { distance: number; time: number; price: number; }
interface WorkHour { day_id: number; day_label: string; is_open: boolean; open_time: string; close_time: string; }

const DAYS_OF_WEEK = [
  { id: 0, label: "Domingo" }, { id: 1, label: "Segunda-feira" }, { id: 2, label: "Terça-feira" },
  { id: 3, label: "Quarta-feira" }, { id: 4, label: "Quinta-feira" }, { id: 5, label: "Sexta-feira" }, { id: 6, label: "Sábado" },
]

const DEFAULT_SCHEDULE: WorkHour[] = DAYS_OF_WEEK.map(day => ({
  day_id: day.id, day_label: day.label, is_open: true, open_time: "18:00", close_time: "23:00"
}))

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [restaurantId, setRestaurantId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('') // <--- NOVO CAMPO
  
  const [address, setAddress] = useState({ zip: '', street: '', number: '', neighborhood: '', city: '', state: '' })
  const [tiers, setTiers] = useState<DeliveryTier[]>([])
  const [schedule, setSchedule] = useState<WorkHour[]>(DEFAULT_SCHEDULE)

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/admin/login')

        const { data } = await supabase.from('restaurants').select('*').single()
        
        if (data) {
            setRestaurantId(data.id)
            setName(data.name || "")
            setPhone(data.phone || "") // <--- CARREGA TELEFONE
            
            setAddress({
                zip: data.address_zip || '', street: data.address_street || '', number: data.address_number || '',
                neighborhood: data.address_neighborhood || '', city: data.address_city || '', state: data.address_state || ''
            })

            if (data.delivery_tiers) setTiers(data.delivery_tiers)
            else setTiers([{ distance: 1, time: 20, price: 0 }])

            if (data.work_hours) setSchedule(data.work_hours)
        }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const handleBlurCep = async () => {
      const cep = address.zip.replace(/\D/g, '')
      if (cep.length < 8) return
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
          setAddress(prev => ({ ...prev, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }))
      }
  }

  const updateTier = (index: number, field: keyof DeliveryTier, value: string) => {
    const newTiers = [...tiers]; newTiers[index] = { ...newTiers[index], [field]: parseFloat(value) || 0 }; setTiers(newTiers)
  }
  const addTier = () => setTiers([...tiers, { distance: 1, time: 30, price: 5 }])
  const removeTier = (index: number) => setTiers(tiers.filter((_, i) => i !== index))
  
  const handleTimeChange = (index: number, field: keyof WorkHour, value: any) => {
    const newSchedule = [...schedule]; 
    // @ts-ignore
    newSchedule[index] = { ...newSchedule[index], [field]: value }; setSchedule(newSchedule)
  }

  const handleSave = async () => {
    setSaving(true)
    const sortedTiers = [...tiers].sort((a, b) => a.distance - b.distance)

    const { error } = await supabase.from('restaurants').update({
            name,
            phone, // <--- SALVA TELEFONE
            delivery_tiers: sortedTiers,
            work_hours: schedule,
            address_zip: address.zip, address_street: address.street, address_number: address.number,
            address_neighborhood: address.neighborhood, address_city: address.city, address_state: address.state
        }).eq('id', restaurantId)

    if (error) alert('Erro ao salvar.')
    else { alert('Salvo com sucesso! ✅'); fetchSettings() }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600"/></div>

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 pb-8 mb-20">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Configurações da Loja</h1>
            <button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar
            </button>
        </div>

      <div className="max-w-4xl mx-auto space-y-8 p-6">
        
        {/* 1. DADOS DA LOJA */}
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Store className="text-red-600"/> Dados Básicos</h2>
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Loja</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full border p-3 rounded-lg outline-none focus:border-red-500" placeholder="Ex: Hamburgueria do João" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp da Loja (Para receber pedidos)</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                        <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border p-3 pl-10 rounded-lg outline-none focus:border-red-500" placeholder="5511999999999" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Coloque o número com DDD (Ex: 5511999999999)</p>
                </div>
            </div>
            
            <h3 className="font-bold text-gray-600 text-sm uppercase mt-4">Endereço (Base para cálculo de frete)</h3>
            <div className="grid grid-cols-2 gap-4">
                <input value={address.zip} onChange={e => setAddress({...address, zip: e.target.value})} onBlur={handleBlurCep} className="w-full border p-3 rounded-lg" placeholder="CEP" />
                <input value={address.city} onChange={e => setAddress({...address, city: e.target.value})} className="w-full border p-3 rounded-lg bg-gray-50" placeholder="Cidade" />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <input value={address.street} onChange={e => setAddress({...address, street: e.target.value})} className="col-span-2 w-full border p-3 rounded-lg bg-gray-50" placeholder="Rua" />
                <input value={address.number} onChange={e => setAddress({...address, number: e.target.value})} className="w-full border p-3 rounded-lg" placeholder="Número" />
            </div>
        </div>

        <hr />
        {/* 2. RAIOS DE ENTREGA (MANTIDO) */}
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><MapPin className="text-red-600"/> Taxas de Entrega</h2>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                {tiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-10 gap-4 items-center">
                        <div className="col-span-3 relative"><input type="number" value={tier.distance} onChange={(e) => updateTier(index, 'distance', e.target.value)} className="w-full pl-3 pr-8 py-2 border rounded font-bold" /><span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">km</span></div>
                        <div className="col-span-3 relative"><input type="number" value={tier.time} onChange={(e) => updateTier(index, 'time', e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded" /><span className="absolute right-3 top-2.5 text-xs text-gray-400">min</span></div>
                        <div className="col-span-3 relative"><span className="absolute left-3 top-2.5 text-xs text-green-600 font-bold">R$</span><input type="number" value={tier.price} onChange={(e) => updateTier(index, 'price', e.target.value)} className="w-full pl-8 pr-3 py-2 border rounded font-bold" /></div>
                        <div className="col-span-1 flex justify-center"><button onClick={() => removeTier(index)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button></div>
                    </div>
                ))}
                <button onClick={addTier} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:border-red-500 hover:text-red-600 flex items-center justify-center gap-2"><Plus size={18} /> Adicionar Faixa</button>
            </div>
        </div>
        <hr />
        {/* 3. HORÁRIOS (MANTIDO) */}
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Clock className="text-red-600"/> Horários</h2>
            <div className="border border-gray-200 rounded-xl divide-y">
                {schedule.map((item, index) => (
                    <div key={item.day_id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3"><input type="checkbox" checked={item.is_open} onChange={(e) => handleTimeChange(index, 'is_open', e.target.checked)} className="w-5 h-5 accent-red-600" /><span className={item.is_open ? 'font-bold' : 'text-gray-400'}>{item.day_label}</span></div>
                        {item.is_open && <div className="flex items-center gap-2"><input type="time" value={item.open_time} onChange={(e) => handleTimeChange(index, 'open_time', e.target.value)} className="border p-1 rounded" /><span>às</span><input type="time" value={item.close_time} onChange={(e) => handleTimeChange(index, 'close_time', e.target.value)} className="border p-1 rounded" /></div>}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  )
}