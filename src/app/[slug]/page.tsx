"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { ShoppingBag, Star, Clock, MapPin, ChevronLeft, Plus, Minus, X, Check, Search, DollarSign, Bike, Loader2, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { calculateDistance, calculateDeliveryFee, getCoordinates } from "@/lib/geo"

// --- TIPOS ---
interface Product { id: string; name: string; description: string; price: number; image_url: string; category_id: string; is_active: boolean; addons: any[]; }
interface CartItem { internalId: string; product: Product; quantity: number; selectedAddons: any[]; totalPrice: number; observation: string; }

export default function StorePage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  // Dados
  const [restaurant, setRestaurant] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [deliveryTiers, setDeliveryTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [restoCoords, setRestoCoords] = useState<{lat: number, lon: number} | null>(null)

  // UI
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState("")

  // Carrinho
  const [addonSelections, setAddonSelections] = useState<Record<string, any[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [observation, setObservation] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  
  // Checkout
  const [step, setStep] = useState<'cart' | 'address' | 'payment' | 'success'>('cart')
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [address, setAddress] = useState({ cep: "", street: "", number: "", neighborhood: "", city: "São Paulo", state: "SP", complement: "" })
  const [calculatingFee, setCalculatingFee] = useState(false)
  const [deliveryInfo, setDeliveryInfo] = useState<{ price: number, time: number, distance: number, valid: boolean } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("pix")
  const [changeFor, setChangeFor] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Guardar ID do pedido para a mensagem
  const [lastOrderId, setLastOrderId] = useState("")

  // --- EFEITOS ---
  useEffect(() => {
    const handleScroll = () => {
      const offsets = categories.map(cat => ({ id: cat.id, offset: document.getElementById(`cat-${cat.id}`)?.offsetTop || 0 }))
      const current = offsets.findLast(o => window.scrollY + 200 >= o.offset)
      if (current) setActiveCategory(current.id)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [categories])

  useEffect(() => { fetchStoreData() }, [])

  const fetchStoreData = async () => {
    const { data: resto } = await supabase.from('restaurants').select('*').eq('slug', params.slug).single()
    if (!resto) return alert("Loja não encontrada!")
    setRestaurant(resto)
    if (resto.delivery_tiers) setDeliveryTiers(resto.delivery_tiers)

    let restoQuery = `${resto.name}, Brasil`
    if (resto.address_street && resto.address_number) restoQuery = `${resto.address_street}, ${resto.address_number} - ${resto.address_city}, ${resto.address_state}`
    getCoordinates(restoQuery).then(coords => { if(coords) setRestoCoords(coords) })

    const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', resto.id).order('order')
    if (cats) { setCategories(cats); if(cats.length > 0) setActiveCategory(cats[0].id) }

    const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', resto.id).eq('is_active', true)
    if (prods) setProducts(prods)
    setLoading(false)
  }

  const handleBlurCep = async () => {
    const cepLimpo = address.cep.replace(/\D/g, '')
    if (cepLimpo.length < 8) return
    setCalculatingFee(true); setDeliveryInfo(null)
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
        const data = await res.json()
        if (!data.erro) {
            setAddress(prev => ({ ...prev, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }))
            if (restoCoords) {
                const clientCoords = await getCoordinates(`${data.logradouro}, ${data.localidade}, ${data.uf}`)
                if (clientCoords) {
                    const dist = calculateDistance(restoCoords.lat, restoCoords.lon, clientCoords.lat, clientCoords.lon)
                    const feeData = calculateDeliveryFee(dist, deliveryTiers)
                    setDeliveryInfo({ price: feeData.price, time: feeData.time, distance: dist, valid: feeData.valid })
                }
            }
        }
    } catch (err) { console.error(err) } finally { setCalculatingFee(false) }
  }

  // --- CARRINHO ---
  const openProduct = (prod: Product) => { setSelectedProduct(prod); setQuantity(1); setObservation(""); setAddonSelections({}); }
  const toggleAddon = (groupId: string, option: any, group: any) => {
    setAddonSelections(prev => {
        const current = prev[groupId] || []; const exists = current.some(o => o.name === option.name)
        if (exists) return { ...prev, [groupId]: current.filter(o => o.name !== option.name) }
        if (group.max_options > 0 && current.length >= group.max_options) return prev
        return { ...prev, [groupId]: [...current, option] }
    })
  }
  const calculateProductTotal = () => {
    if (!selectedProduct) return 0; let total = selectedProduct.price
    Object.values(addonSelections).forEach(opts => opts.forEach(o => total += o.price || 0))
    return total * quantity
  }
  const addToCart = () => {
      if (!selectedProduct) return
      setCart([...cart, { internalId: Date.now().toString(), product: selectedProduct, quantity, selectedAddons: Object.values(addonSelections).flat(), totalPrice: calculateProductTotal(), observation }]); setSelectedProduct(null);
  }
  const removeFromCart = (id: string) => setCart(cart.filter(i => i.internalId !== id))
  
  const cartSubtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0)
  const deliveryFee = deliveryInfo?.valid ? deliveryInfo.price : 0
  const finalTotal = cartSubtotal + deliveryFee

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  // --- FUNÇÃO DE ENVIAR P/ WHATSAPP ---
  const sendToWhatsApp = (orderId: string) => {
      const itemsList = cart.map(item => {
          const addons = item.selectedAddons.map(a => `+ ${a.name}`).join(', ')
          return `▪️ ${item.quantity}x ${item.product.name}${addons ? ` (${addons})` : ''}${item.observation ? `\n   Obs: ${item.observation}` : ''}`
      }).join('\n')

      const msg = `*NOVO PEDIDO #${orderId.slice(0, 4)}* 🍔\n\n` +
          `*Cliente:* ${customerName}\n` +
          `*Telefone:* ${customerPhone}\n\n` +
          `*PEDIDO:*\n${itemsList}\n\n` +
          `*ENTREGA:* ${formatMoney(deliveryFee)} (${deliveryInfo?.distance}km)\n` +
          `*Endereço:* ${address.street}, ${address.number}\n` +
          `*Bairro:* ${address.neighborhood}\n${address.complement ? `*Comp:* ${address.complement}\n` : ''}\n` +
          `*TOTAL:* ${formatMoney(finalTotal)}\n` +
          `*Pagamento:* ${paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'} ${changeFor ? `(Troco p/ ${changeFor})` : ''}`

      // Usa o telefone cadastrado no admin ou um fallback
      const phone = restaurant.phone || "5511999999999" 
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      window.open(url, '_blank')
  }

  const handlePlaceOrder = async () => {
    if (!customerName || !customerPhone || !address.street || !address.number) return alert("Preencha todos os dados!")
    if (deliveryTiers.length > 0 && !deliveryInfo?.valid) return alert("Frete não calculado ou fora da área.")

    setIsSubmitting(true)
    const { data: order, error } = await supabase.from('orders').insert({
        restaurant_id: restaurant.id, customer_name: customerName, customer_phone: customerPhone, total: finalTotal,
        status: 'pending', payment_method: paymentMethod, change_for: changeFor,
        address: { ...address, distance: deliveryInfo?.distance }, delivery_fee: deliveryFee
    }).select().single()

    if(!error) {
        const items = cart.map(i => ({ order_id: order.id, product_name: i.product.name, quantity: i.quantity, price: i.product.price, observation: i.observation, addons: i.selectedAddons }))
        await supabase.from('order_items').insert(items)
        
        // SUCESSO!
        setLastOrderId(order.id)
        setIsSubmitting(false)
        setStep('success')
        
        // Abre WhatsApp automaticamente
        sendToWhatsApp(order.id)
        
        setCart([]) // Limpa carrinho depois de garantir que temos os dados p/ msg
    } else {
        setIsSubmitting(false); alert("Erro ao pedir.")
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-red-600"/></div>

  if (step === 'success') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-green-50 text-center font-sans">
              <Check size={64} className="text-green-600 mb-4" />
              <h1 className="text-3xl font-extrabold text-green-900 mb-2">Pedido Recebido!</h1>
              <p className="text-green-700 mb-8 font-medium">A loja recebeu seu pedido. Se o WhatsApp não abriu, clique abaixo.</p>
              
              <button onClick={() => sendToWhatsApp(lastOrderId)} className="bg-green-600 text-white font-bold py-4 px-10 rounded-full shadow-lg hover:bg-green-700 flex items-center gap-2 mb-4 animate-bounce">
                  <Send size={20} /> Enviar para WhatsApp
              </button>

              <button onClick={() => { setStep('cart'); setIsCartOpen(false); setDeliveryInfo(null); }} className="text-green-800 font-bold hover:underline">
                  Voltar ao Cardápio
              </button>
          </div>
      )
  }

  return (
    // ... (RESTANTE DO JSX IGUAL À VERSÃO ANTERIOR - CABEÇALHO, LISTA, CARRINHO) ...
    // Vou colocar aqui o JSX completo para não ter erro de copy/paste
    <div className="bg-[#F4F4F5] min-h-screen pb-28 font-sans text-gray-900">
      <header className="bg-white pb-4 shadow-sm relative z-20">
          <div className="h-40 md:h-48 w-full bg-gray-800 relative overflow-hidden">
             {restaurant.image_url ? <img src={restaurant.image_url} className="w-full h-full object-cover opacity-80"/> : <div className="w-full h-full bg-gradient-to-r from-red-700 to-red-900"></div>}
          </div>
          <div className="max-w-3xl mx-auto px-4 relative">
              <div className="-mt-10 mb-4 flex justify-between items-end">
                  <div className="bg-white p-1 rounded-2xl shadow-lg inline-block">
                     <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200">
                        {restaurant.image_url ? <img src={restaurant.image_url} className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-red-600">{restaurant.name.charAt(0)}</span>}
                     </div>
                  </div>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1.5 shadow-sm mb-1"><div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div> Aberto</span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{restaurant.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-2 font-medium">
                  <span className="flex items-center gap-1"><Star size={14} className="text-yellow-500 fill-yellow-500"/> 4.8</span>
                  <span className="flex items-center gap-1"><Clock size={14}/> 30-45 min</span>
                  <span className="flex items-center gap-1"><DollarSign size={14}/> Entrega Grátis</span>
              </div>
          </div>
      </header>

      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm py-3">
          <div className="max-w-3xl mx-auto px-4 overflow-x-auto no-scrollbar flex gap-2">
              {categories.map(cat => (
                  <button key={cat.id} onClick={() => { setActiveCategory(cat.id); document.getElementById(`cat-${cat.id}`)?.scrollIntoView({behavior: 'smooth', block: 'start'}) }} className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${activeCategory === cat.id ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>{cat.name}</button>
              ))}
          </div>
      </div>

      <main className="max-w-3xl mx-auto p-4 space-y-10 mt-6">
          {categories.map(cat => {
              const catProducts = products.filter(p => p.category_id === cat.id)
              if (catProducts.length === 0) return null
              return (
                  <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-40">
                      <h2 className="text-xl font-extrabold text-gray-900 mb-5">{cat.name}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {catProducts.map(product => (
                              <div key={product.id} onClick={() => openProduct(product)} className="bg-white p-3 rounded-xl shadow-sm cursor-pointer flex gap-4 h-full border border-gray-200 hover:border-red-500 hover:shadow-md transition-all">
                                  <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                                      <div><h3 className="font-bold text-gray-800 text-base leading-snug">{product.name}</h3><p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">{product.description}</p></div>
                                      <div className="mt-3"><span className="text-gray-900 font-bold text-base">{formatMoney(product.price)}</span></div>
                                  </div>
                                  <div className="w-28 h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative border border-gray-100">
                                      {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ShoppingBag/></div>}
                                      <div className="absolute bottom-0 right-0 bg-white/95 p-1.5 rounded-tl-xl shadow-sm"><Plus size={16} className="text-red-600" /></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )
          })}
      </main>

      {cart.length > 0 && !isCartOpen && (
          <div className="fixed bottom-6 left-0 right-0 px-4 z-40 max-w-3xl mx-auto animate-in slide-in-from-bottom-4">
              <button onClick={() => { setStep('cart'); setIsCartOpen(true); }} className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-red-900/20 flex justify-between items-center transform transition-transform hover:scale-[1.02]">
                  <div className="flex items-center gap-3"><div className="bg-red-800 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">{cart.length}</div><span>Ver Sacola</span></div><span className="text-lg">{formatMoney(cartSubtotal)}</span>
              </button>
          </div>
      )}

      {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] sm:rounded-3xl rounded-t-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-12">
                  <div className="h-56 bg-gray-200 relative flex-shrink-0">
                      <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-sm hover:bg-white text-gray-900"><X size={20}/></button>
                      {selectedProduct.image_url && <img src={selectedProduct.image_url} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 bg-white">
                      <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{selectedProduct.name}</h2>
                      <p className="text-gray-600 text-sm leading-relaxed">{selectedProduct.description}</p>
                      {selectedProduct.addons?.map((group: any) => (
                          <div key={group.id} className="mt-8">
                              <h3 className="font-bold text-gray-900 text-lg mb-3">{group.title} <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded ml-2 uppercase">{group.required ? 'Obrigatório' : 'Opcional'}</span></h3>
                              {group.options.map((opt:any, i:number) => (
                                  <label key={i} className={`flex justify-between items-center p-4 border rounded-xl mt-2 cursor-pointer transition-all ${addonSelections[group.id]?.some(o => o.name === opt.name) ? 'border-red-500 bg-red-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                                      <span className="text-sm font-bold text-gray-700">{opt.name}</span>
                                      <div className="flex items-center gap-3">
                                          {opt.price > 0 && <span className="text-sm font-bold text-gray-900">+ {formatMoney(opt.price)}</span>}
                                          <input type="checkbox" className="accent-red-600 w-5 h-5" checked={addonSelections[group.id]?.some(o => o.name === opt.name)} onChange={() => toggleAddon(group.id, opt, group)} />
                                      </div>
                                  </label>
                              ))}
                          </div>
                      ))}
                      <div className="mt-8"><label className="text-sm font-bold text-gray-900 block mb-2">Observação</label><textarea value={observation} onChange={e => setObservation(e.target.value)} placeholder="Ex: Sem cebola, caprichar no molho..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:bg-white focus:border-red-500 outline-none text-gray-900" rows={3}/></div>
                  </div>
                  <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4 bg-white">
                      <div className="flex items-center border border-gray-300 rounded-xl px-4 py-2 gap-4"><button onClick={() => setQuantity(Math.max(1, quantity-1))} className="text-gray-500 hover:text-red-600"><Minus size={20}/></button><span className="font-bold text-gray-900 text-lg">{quantity}</span><button onClick={() => setQuantity(quantity+1)} className="text-gray-500 hover:text-red-600"><Plus size={20}/></button></div>
                      <button onClick={addToCart} className="flex-1 bg-red-600 text-white font-bold py-3.5 rounded-xl flex justify-between px-6 hover:bg-red-700 transition-colors shadow-lg shadow-red-100"><span>Adicionar</span><span>{formatMoney(calculateProductTotal())}</span></button>
                  </div>
              </div>
          </div>
      )}

      {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-white sm:bg-gray-100 flex flex-col animate-in slide-in-from-right">
              <div className="bg-white p-4 shadow-sm flex items-center gap-4 border-b border-gray-200">
                  <button onClick={() => { if(step === 'cart') setIsCartOpen(false); else setStep('cart'); }} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="text-gray-800"/></button>
                  <h2 className="font-extrabold text-lg text-gray-900">Checkout</h2>
              </div>

              <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full p-4 space-y-6 bg-gray-50 sm:bg-transparent">
                  {step === 'cart' && (
                      <div className="space-y-4">
                          {cart.map(item => (
                              <div key={item.internalId} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex justify-between">
                                  <div>
                                      <span className="font-bold text-gray-500">{item.quantity}x </span><span className="font-bold text-gray-900">{item.product.name}</span>
                                      <p className="text-red-600 font-bold mt-1">{formatMoney(item.totalPrice)}</p>
                                  </div>
                                  <button onClick={() => removeFromCart(item.internalId)}><X size={20} className="text-gray-400 hover:text-red-600"/></button>
                              </div>
                          ))}
                          <div className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between text-xl font-extrabold text-gray-900"><span>Total</span><span>{formatMoney(cartSubtotal)}</span></div>
                      </div>
                  )}

                  {step === 'address' && (
                      <div className="space-y-4">
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg"><Star size={18} className="text-yellow-500 fill-yellow-500"/> Seus Dados</h3>
                              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome Completo" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none focus:border-red-600 text-gray-900 font-medium placeholder:text-gray-400" />
                              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="WhatsApp (Com DDD)" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none focus:border-red-600 text-gray-900 font-medium placeholder:text-gray-400" />
                          </div>

                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg"><MapPin size={18} className="text-red-600"/> Entrega</h3>
                              <div className="flex gap-2">
                                  <input value={address.cep} onChange={e => setAddress({...address, cep: e.target.value})} onBlur={handleBlurCep} placeholder="Digite seu CEP (Ex: 01001000)" className="flex-1 bg-white border-2 border-blue-100 p-3 rounded-xl outline-none focus:border-blue-500 text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal" />
                                  <div className="w-24 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200">{calculatingFee ? <Loader2 className="animate-spin text-blue-600"/> : <Search className="text-gray-400"/>}</div>
                              </div>
                              {deliveryInfo && deliveryInfo.valid && <div className="bg-green-50 p-4 rounded-xl border border-green-200 animate-in fade-in"><p className="text-green-900 font-bold flex justify-between text-lg"><span className="flex items-center gap-2"><Bike size={20}/> Entrega</span><span>{deliveryInfo.price === 0 ? 'GRÁTIS' : formatMoney(deliveryInfo.price)}</span></p><p className="text-sm text-green-700 mt-1 font-medium">Distância: {deliveryInfo.distance}km • Tempo: {deliveryInfo.time} min</p></div>}
                              {deliveryInfo && !deliveryInfo.valid && <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-red-800 text-sm font-bold">Ops! Estamos muito longe para entregar ({deliveryInfo.distance}km).</div>}
                              <div className="grid grid-cols-3 gap-3">
                                  <input value={address.street} onChange={e => setAddress({...address, street: e.target.value})} placeholder="Rua" className="col-span-2 w-full bg-white border border-gray-300 p-3 rounded-xl outline-none text-gray-900 font-medium" />
                                  <input value={address.number} onChange={e => setAddress({...address, number: e.target.value})} placeholder="Nº" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none text-gray-900 font-medium" />
                              </div>
                              <input value={address.neighborhood} onChange={e => setAddress({...address, neighborhood: e.target.value})} placeholder="Bairro" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none text-gray-900 font-medium" />
                              <input value={address.complement} onChange={e => setAddress({...address, complement: e.target.value})} placeholder="Complemento (Apto, Bloco)" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none text-gray-900 font-medium" />
                          </div>
                      </div>
                  )}

                  {step === 'payment' && (
                      <div className="space-y-4">
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
                              <div className="flex justify-between text-gray-600 font-medium"><span>Subtotal</span><span>{formatMoney(cartSubtotal)}</span></div>
                              <div className="flex justify-between text-blue-600 font-medium"><span>Taxa Entrega</span><span>{formatMoney(deliveryFee)}</span></div>
                              <div className="border-t border-gray-200 my-3"></div>
                              <div className="flex justify-between font-extrabold text-xl text-gray-900"><span>Total</span><span>{formatMoney(finalTotal)}</span></div>
                          </div>
                          {['pix', 'card', 'cash'].map(m => (
                              <label key={m} className={`flex gap-4 bg-white p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === m ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                  <input type="radio" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} className="accent-red-600 w-5 h-5"/>
                                  <span className="font-bold capitalize text-gray-900">{m === 'card' ? 'Cartão' : m === 'cash' ? 'Dinheiro' : 'PIX'}</span>
                              </label>
                          ))}
                          {paymentMethod === 'cash' && <div className="bg-white p-4 rounded-xl border border-gray-200"><label className="text-sm font-bold text-gray-900 block mb-2">Troco para quanto?</label><input value={changeFor} onChange={e => setChangeFor(e.target.value)} placeholder="Ex: 50,00" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none text-gray-900"/></div>}
                      </div>
                  )}
              </div>

              <div className="p-4 bg-white border-t border-gray-200">
                  {step === 'cart' && <button onClick={() => setStep('address')} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors text-lg shadow-lg shadow-red-200">Continuar</button>}
                  {step === 'address' && <button onClick={() => setStep('payment')} disabled={!deliveryInfo?.valid} className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200">Ir para Pagamento</button>}
                  {step === 'payment' && <button onClick={handlePlaceOrder} disabled={isSubmitting} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 shadow-lg shadow-green-200">{isSubmitting ? 'Enviando...' : 'Finalizar Pedido'}</button>}
              </div>
          </div>
      )}
    </div>
  )
}