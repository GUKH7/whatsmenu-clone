"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { ShoppingBag, Star, Clock, MapPin, ChevronLeft, Plus, Minus, X, Check, Search, DollarSign, Bike, Loader2, Send, Ticket, User, LogIn, ChevronRight } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { calculateDistance, calculateDeliveryFee, getCoordinates } from "@/lib/geo"

// --- TIPOS ---
interface Product { id: string; name: string; description: string; price: number; image_url: string; category_id: string; is_active: boolean; addons: any[]; }
interface CartItem { internalId: string; product: Product; quantity: number; selectedAddons: any[]; totalPrice: number; observation: string; }
interface DeliveryInfo { price: number; time: number; distance: number; valid: boolean; }

export default function StorePage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // User State
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [usingSavedAddress, setUsingSavedAddress] = useState(false)

  // Dados Loja & Visual
  const [restaurant, setRestaurant] = useState<any>(null)
  const [primaryColor, setPrimaryColor] = useState('#DC2626') // Cor padrão
  const [banners, setBanners] = useState<string[]>([])
  const [currentBanner, setCurrentBanner] = useState(0)

  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [deliveryTiers, setDeliveryTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [restoCoords, setRestoCoords] = useState<{lat: number, lon: number} | null>(null)

  // UI e Carrinho
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState("")
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
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("pix")
  const [changeFor, setChangeFor] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cupom
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, value: number, type: string } | null>(null)
  const [verifyingCoupon, setVerifyingCoupon] = useState(false)
  const [lastOrderId, setLastOrderId] = useState("")

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    fetchStoreData()
    checkUserSession()
    
    // Banner Rotation
    const timer = setInterval(() => {
        setBanners(prev => {
            if(prev.length > 1) setCurrentBanner(curr => (curr + 1) % prev.length)
            return prev
        })
    }, 5000)

    const handleScroll = () => {
      const offsets = categories.map(cat => ({ id: cat.id, offset: document.getElementById(`cat-${cat.id}`)?.offsetTop || 0 }))
      const current = offsets.findLast(o => window.scrollY + 200 >= o.offset)
      if (current) setActiveCategory(current.id)
    }
    window.addEventListener('scroll', handleScroll)
    return () => { window.removeEventListener('scroll', handleScroll); clearInterval(timer); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
          setCurrentUser(user)
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
          if (profile) { setCustomerName(profile.name || ''); setCustomerPhone(profile.phone || '') }
          const { data: addresses } = await supabase.from('customer_addresses').select('*').eq('user_id', user.id)
          if (addresses && addresses.length > 0) setSavedAddresses(addresses)
      }
  }

  const fetchStoreData = async () => {
    const { data: resto } = await supabase.from('restaurants').select('*').eq('slug', params.slug).single()
    if (!resto) return alert("Loja não encontrada!")
    setRestaurant(resto)
    if (resto.delivery_tiers) setDeliveryTiers(resto.delivery_tiers)
    
    // Configura Visual
    if (resto.primary_color) setPrimaryColor(resto.primary_color)
    if (resto.banners && resto.banners.length > 0) setBanners(resto.banners)

    let restoQuery = `${resto.name}, Brasil`
    if (resto.address_street && resto.address_number) restoQuery = `${resto.address_street}, ${resto.address_number} - ${resto.address_city}, ${resto.address_state}`
    getCoordinates(restoQuery).then(coords => { if(coords) setRestoCoords(coords) })

    const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', resto.id).order('order')
    if (cats) { setCategories(cats); if(cats.length > 0) setActiveCategory(cats[0].id) }

    const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', resto.id).eq('is_active', true)
    if (prods) setProducts(prods)
    setLoading(false)
  }

  // --- LOGICA CARRINHO E FRETE ---
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
  let discountAmount = 0
  if (appliedCoupon) {
      if (appliedCoupon.type === 'percent') discountAmount = cartSubtotal * (appliedCoupon.value / 100)
      else discountAmount = appliedCoupon.value
  }
  if (discountAmount > cartSubtotal) discountAmount = cartSubtotal
  const finalTotal = cartSubtotal + deliveryFee - discountAmount
  const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleApplyCoupon = async () => {
      if (!couponCode) return
      setVerifyingCoupon(true)
      try {
          const { data, error } = await supabase.from('coupons').select('*').eq('code', couponCode.toUpperCase().trim()).eq('restaurant_id', restaurant.id).eq('active', true).single()
          if (error || !data) { alert("Cupom inválido."); setAppliedCoupon(null) } else { setAppliedCoupon({ code: data.code, value: data.value, type: data.discount_type }) }
      } catch (err) { console.error(err) } finally { setVerifyingCoupon(false) }
  }

  const sendToWhatsApp = (orderId: string) => {
      const itemsList = cart.map(item => {
          const addons = item.selectedAddons.map(a => `+ ${a.name}`).join(', ')
          return `▪️ ${item.quantity}x ${item.product.name}${addons ? ` (${addons})` : ''}${item.observation ? `\n   Obs: ${item.observation}` : ''}`
      }).join('\n')
      const msg = `*NOVO PEDIDO #${orderId.slice(0, 4)}* 🍔\n\n*Cliente:* ${customerName}\n*Endereço:* ${address.street}, ${address.number}\n\n*PEDIDO:*\n${itemsList}\n\n*TOTAL:* ${formatMoney(finalTotal)}\n*Pagamento:* ${paymentMethod}`
      const phone = restaurant.phone || "5511999999999" 
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handlePlaceOrder = async () => {
    if (!customerName || !customerPhone || !address.street || !address.number) return alert("Preencha todos os dados!")
    if (deliveryTiers.length > 0 && !deliveryInfo?.valid) return alert("Frete não calculado ou fora da área.")
    setIsSubmitting(true)
    if (currentUser) {
        if (!usingSavedAddress) await supabase.from('customer_addresses').insert({ user_id: currentUser.id, cep: address.cep, street: address.street, number: address.number, neighborhood: address.neighborhood, city: address.city, state: address.state, complement: address.complement })
        await supabase.from('profiles').upsert({ id: currentUser.id, name: customerName, phone: customerPhone, updated_at: new Date() })
    }
    const { data: order, error } = await supabase.from('orders').insert({
        restaurant_id: restaurant.id, user_id: currentUser?.id || null,
        customer_name: customerName, customer_phone: customerPhone, total: finalTotal,
        status: 'pending', payment_method: paymentMethod, change_for: changeFor,
        address: { ...address, distance: deliveryInfo?.distance }, 
        delivery_fee: deliveryFee, discount: discountAmount, coupon_code: appliedCoupon?.code
    }).select().single()
    if(!error) {
        const items = cart.map(i => ({ order_id: order.id, product_name: i.product.name, quantity: i.quantity, price: i.product.price, observation: i.observation, addons: i.selectedAddons }))
        await supabase.from('order_items').insert(items)
        setLastOrderId(order.id); sendToWhatsApp(order.id); setStep('success'); setCart([]); setAppliedCoupon(null); setIsSubmitting(false)
    } else { setIsSubmitting(false); alert("Erro ao pedir.") }
  }

  const selectSavedAddress = async (savedAddr: any) => {
      setAddress({ cep: savedAddr.cep, street: savedAddr.street, number: savedAddr.number, neighborhood: savedAddr.neighborhood, city: savedAddr.city, state: savedAddr.state, complement: savedAddr.complement || "" })
      setUsingSavedAddress(true)
      if (restoCoords) {
          setCalculatingFee(true)
          const clientCoords = await getCoordinates(`${savedAddr.street}, ${savedAddr.number}, ${savedAddr.city}, ${savedAddr.state}`)
          if (clientCoords) {
              const dist = calculateDistance(restoCoords.lat, restoCoords.lon, clientCoords.lat, clientCoords.lon)
              const feeData = calculateDeliveryFee(dist, deliveryTiers)
              setDeliveryInfo({ price: feeData.price, time: feeData.time, distance: dist, valid: feeData.valid })
          }
          setCalculatingFee(false)
      }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-red-600"/></div>

  if (step === 'success') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-green-50 text-center font-sans">
              <Check size={64} style={{ color: primaryColor }} className="mb-4" />
              <h1 className="text-3xl font-extrabold text-green-900 mb-2">Pedido Recebido!</h1>
              <p className="text-green-700 mb-8 font-medium">A loja já está preparando seu pedido.</p>
              <button onClick={() => sendToWhatsApp(lastOrderId)} className="text-white font-bold py-4 px-10 rounded-full shadow-lg flex items-center gap-2 mb-4 animate-bounce" style={{ backgroundColor: '#25D366' }}><Send size={20} /> Enviar para WhatsApp</button>
              <button onClick={() => { setStep('cart'); setIsCartOpen(false); setDeliveryInfo(null); setAppliedCoupon(null); }} className="font-bold hover:underline" style={{ color: primaryColor }}>Voltar ao Cardápio</button>
          </div>
      )
  }

  return (
    <div className="bg-[#F4F4F5] min-h-screen pb-28 font-sans text-gray-900">
      
      {/* HEADER DINÂMICO */}
      <header className="bg-white pb-4 shadow-sm relative z-20">
          <div className="h-48 md:h-64 w-full bg-gray-200 relative overflow-hidden group">
             {/* CARROSSEL DE BANNERS */}
             {banners.length > 0 ? (
                 <>
                    {banners.map((b, i) => (
                        <img key={i} src={b} className={`w-full h-full object-cover absolute transition-opacity duration-700 ${i === currentBanner ? 'opacity-100' : 'opacity-0'}`} />
                    ))}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {banners.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentBanner ? 'bg-white w-4' : 'bg-white/50'}`}></div>)}
                    </div>
                 </>
             ) : (
                 restaurant.image_url ? <img src={restaurant.image_url} className="w-full h-full object-cover opacity-90"/> : <div className="w-full h-full" style={{ backgroundColor: primaryColor }}></div>
             )}
             
             {/* BOTÃO LOGIN/CONTA */}
             <div className="absolute top-4 right-4 z-30">
                 {currentUser ? (
                     <Link href="/minha-conta" className="bg-white/90 backdrop-blur text-gray-800 px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow hover:bg-white transition-all"><User size={14}/> Minha Conta</Link>
                 ) : (
                     <Link href={`/auth?returnUrl=${encodeURIComponent(pathname)}`} className="bg-white/90 backdrop-blur text-gray-800 px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow hover:bg-white transition-all"><LogIn size={14}/> Entrar</Link>
                 )}
             </div>
          </div>

          <div className="max-w-3xl mx-auto px-4 relative">
              <div className="-mt-10 mb-4 flex justify-between items-end">
                  <div className="bg-white p-1 rounded-2xl shadow-lg inline-block">
                     <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200">
                        {restaurant.logo_url ? <img src={restaurant.logo_url} className="w-full h-full object-cover" /> : restaurant.image_url ? <img src={restaurant.image_url} className="w-full h-full object-cover" /> : <span className="text-2xl font-bold" style={{ color: primaryColor }}>{restaurant.name.charAt(0)}</span>}
                     </div>
                  </div>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1.5 shadow-sm mb-1"><div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div> Aberto</span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{restaurant.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-2 font-medium">
              <span className="flex items-center gap-1">
  <Star size={14} className="text-yellow-500 fill-yellow-500"/> 
  {restaurant.rating_average ? Number(restaurant.rating_average).toFixed(1) : 'Novo'} 
  <span className="text-xs text-gray-400">({restaurant.rating_count || 0})</span>
</span>
                  <span className="flex items-center gap-1"><Clock size={14}/> 30-45 min</span>
                  <span className="flex items-center gap-1"><DollarSign size={14}/> Entrega Grátis</span>
              </div>
          </div>
      </header>

      {/* MENU (Cor Dinâmica) */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm py-3">
          <div className="max-w-3xl mx-auto px-4 overflow-x-auto no-scrollbar flex gap-2">
              {categories.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => { setActiveCategory(cat.id); document.getElementById(`cat-${cat.id}`)?.scrollIntoView({behavior: 'smooth', block: 'start'}) }} 
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${activeCategory === cat.id ? 'text-white' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    style={activeCategory === cat.id ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                  >
                      {cat.name}
                  </button>
              ))}
          </div>
      </div>

      {/* LISTA */}
      <main className="max-w-3xl mx-auto p-4 space-y-10 mt-6">
          {categories.map(cat => {
              const catProducts = products.filter(p => p.category_id === cat.id)
              if (catProducts.length === 0) return null
              return (
                  <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-40">
                      <h2 className="text-xl font-extrabold text-gray-900 mb-5">{cat.name}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {catProducts.map(product => (
                              <div key={product.id} onClick={() => openProduct(product)} className="bg-white p-3 rounded-xl shadow-sm cursor-pointer flex gap-4 h-full border border-gray-200 hover:shadow-md transition-all" style={{ borderColor: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = primaryColor} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}>
                                  <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                                      <div><h3 className="font-bold text-gray-800 text-base leading-snug">{product.name}</h3><p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">{product.description}</p></div>
                                      <div className="mt-3"><span className="text-gray-900 font-bold text-base">{formatMoney(product.price)}</span></div>
                                  </div>
                                  <div className="w-28 h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative border border-gray-100">
                                      {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ShoppingBag/></div>}
                                      <div className="absolute bottom-0 right-0 bg-white/95 p-1.5 rounded-tl-xl shadow-sm"><Plus size={16} style={{ color: primaryColor }} /></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )
          })}
      </main>

      {/* BOTÃO FLUTUANTE */}
      {cart.length > 0 && !isCartOpen && (
          <div className="fixed bottom-6 left-0 right-0 px-4 z-40 max-w-3xl mx-auto animate-in slide-in-from-bottom-4">
              <button onClick={() => { setStep('cart'); setIsCartOpen(true); }} className="w-full text-white font-bold py-4 px-6 rounded-2xl shadow-xl flex justify-between items-center transform transition-transform hover:scale-[1.02]" style={{ backgroundColor: primaryColor }}>
                  <div className="flex items-center gap-3"><div className="bg-black/20 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">{cart.length}</div><span>Ver Sacola</span></div><span className="text-lg">{formatMoney(cartSubtotal)}</span>
              </button>
          </div>
      )}

      {/* MODAL PRODUTO */}
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
                                  <label key={i} className="flex justify-between items-center p-4 border rounded-xl mt-2 cursor-pointer transition-all border-gray-200 hover:border-gray-300" style={addonSelections[group.id]?.some(o => o.name === opt.name) ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}>
                                      <span className="text-sm font-bold text-gray-700">{opt.name}</span>
                                      <div className="flex items-center gap-3">
                                          {opt.price > 0 && <span className="text-sm font-bold text-gray-900">+ {formatMoney(opt.price)}</span>}
                                          <input type="checkbox" className="accent-current w-5 h-5" style={{ color: primaryColor }} checked={addonSelections[group.id]?.some(o => o.name === opt.name)} onChange={() => toggleAddon(group.id, opt, group)} />
                                      </div>
                                  </label>
                              ))}
                          </div>
                      ))}
                      <div className="mt-8"><label className="text-sm font-bold text-gray-900 block mb-2">Observação</label><textarea value={observation} onChange={e => setObservation(e.target.value)} placeholder="Ex: Sem cebola..." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none text-gray-900" style={{ borderColor: 'transparent' }} onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} rows={3}/></div>
                  </div>
                  <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4 bg-white">
                      <div className="flex items-center border border-gray-300 rounded-xl px-4 py-2 gap-4"><button onClick={() => setQuantity(Math.max(1, quantity-1))} style={{ color: primaryColor }}><Minus size={20}/></button><span className="font-bold text-gray-900 text-lg">{quantity}</span><button onClick={() => setQuantity(quantity+1)} style={{ color: primaryColor }}><Plus size={20}/></button></div>
                      <button onClick={addToCart} className="flex-1 text-white font-bold py-3.5 rounded-xl flex justify-between px-6 hover:opacity-90 transition-opacity" style={{ backgroundColor: primaryColor }}><span>Adicionar</span><span>{formatMoney(calculateProductTotal())}</span></button>
                  </div>
              </div>
          </div>
      )}

      {/* CHECKOUT MODAL */}
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
                                  <div><span className="font-bold text-gray-500">{item.quantity}x </span><span className="font-bold text-gray-900">{item.product.name}</span><p className="font-bold mt-1" style={{ color: primaryColor }}>{formatMoney(item.totalPrice)}</p></div>
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
                              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome Completo" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none text-gray-900" />
                              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="WhatsApp" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none text-gray-900" />
                          </div>
                          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg"><MapPin size={18} style={{ color: primaryColor }}/> Entrega</h3>
                              {/* ENDEREÇOS SALVOS */}
                              {savedAddresses.length > 0 && (
                                  <div className="mb-4 space-y-2">
                                      {savedAddresses.map(addr => (
                                          <div key={addr.id} onClick={() => selectSavedAddress(addr)} className="p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center" style={usingSavedAddress && address.street === addr.street ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : { borderColor: '#e5e7eb' }}>
                                              <div><p className="font-bold text-sm text-gray-800">{addr.street}, {addr.number}</p><p className="text-xs text-gray-500">{addr.neighborhood} - {addr.city}</p></div>
                                              {usingSavedAddress && address.street === addr.street && <Check size={16} style={{ color: primaryColor }}/>}
                                          </div>
                                      ))}
                                      <button onClick={() => { setUsingSavedAddress(false); setAddress({ cep: "", street: "", number: "", neighborhood: "", city: "São Paulo", state: "SP", complement: "" }); setDeliveryInfo(null); }} className="text-xs font-bold hover:underline" style={{ color: primaryColor }}>+ Usar outro endereço</button>
                                  </div>
                              )}
                              {(!usingSavedAddress || savedAddresses.length === 0) && (
                                  <div className="animate-in fade-in space-y-3">
                                      <div className="flex gap-2"><input value={address.cep} onChange={e => setAddress({...address, cep: e.target.value})} onBlur={handleBlurCep} placeholder="CEP" className="flex-1 bg-white border-2 border-blue-100 p-3 rounded-xl outline-none" /><div className="w-24 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200">{calculatingFee ? <Loader2 className="animate-spin text-blue-600"/> : <Search className="text-gray-400"/>}</div></div>
                                      <div className="grid grid-cols-3 gap-3"><input value={address.street} onChange={e => setAddress({...address, street: e.target.value})} placeholder="Rua" className="col-span-2 w-full bg-white border border-gray-300 p-3 rounded-xl outline-none" /><input value={address.number} onChange={e => setAddress({...address, number: e.target.value})} placeholder="Nº" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none" /></div>
                                      <input value={address.neighborhood} onChange={e => setAddress({...address, neighborhood: e.target.value})} placeholder="Bairro" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none" />
                                      <input value={address.complement} onChange={e => setAddress({...address, complement: e.target.value})} placeholder="Complemento" className="w-full bg-white border border-gray-300 p-3 rounded-xl outline-none" />
                                  </div>
                              )}
                              {deliveryInfo && deliveryInfo.valid && <div className="bg-green-50 p-4 rounded-xl border border-green-200"><p className="text-green-900 font-bold flex justify-between text-lg"><span className="flex items-center gap-2"><Bike size={20}/> Entrega</span><span>{deliveryInfo.price === 0 ? 'GRÁTIS' : formatMoney(deliveryInfo.price)}</span></p><p className="text-sm text-green-700 mt-1 font-medium">Distância: {deliveryInfo.distance}km • Tempo: {deliveryInfo.time} min</p></div>}
                          </div>
                      </div>
                  )}

                  {step === 'payment' && (
                      <div className="space-y-4">
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm mb-3"><Ticket size={16} className="text-orange-500"/> Cupom</h3>
                              <div className="flex gap-2">
                                  <input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Código" disabled={!!appliedCoupon} className="flex-1 bg-white border border-gray-300 p-2 rounded-lg outline-none uppercase font-bold text-gray-700 disabled:bg-gray-50"/>
                                  {appliedCoupon ? <button onClick={() => { setAppliedCoupon(null); setCouponCode("") }} className="bg-red-100 text-red-600 px-4 rounded-lg font-bold text-sm">Remover</button> : <button onClick={handleApplyCoupon} disabled={verifyingCoupon} className="bg-gray-900 text-white px-4 rounded-lg font-bold text-sm">{verifyingCoupon ? <Loader2 className="animate-spin" size={16}/> : 'Aplicar'}</button>}
                              </div>
                              {appliedCoupon && <p className="text-green-600 text-xs font-bold mt-2">Cupom aplicado! Desconto de {appliedCoupon.type === 'percent' ? `${appliedCoupon.value}%` : formatMoney(appliedCoupon.value)}</p>}
                          </div>
                          
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
                              <div className="flex justify-between text-gray-600 font-medium"><span>Subtotal</span><span>{formatMoney(cartSubtotal)}</span></div>
                              <div className="flex justify-between text-blue-600 font-medium"><span>Taxa Entrega</span><span>{formatMoney(deliveryFee)}</span></div>
                              {discountAmount > 0 && <div className="flex justify-between text-green-600 font-bold"><span>Desconto</span><span>- {formatMoney(discountAmount)}</span></div>}
                              <div className="border-t border-gray-200 my-3"></div>
                              <div className="flex justify-between font-extrabold text-xl text-gray-900"><span>Total</span><span>{formatMoney(finalTotal)}</span></div>
                          </div>

                          {['pix', 'card', 'cash'].map(m => (
                              <label key={m} className="flex gap-4 bg-white p-4 rounded-xl border-2 cursor-pointer transition-all border-gray-200 hover:border-gray-300" style={paymentMethod === m ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}>
                                  <input type="radio" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} className="accent-current w-5 h-5" style={{ color: primaryColor }}/>
                                  <span className="font-bold capitalize text-gray-900">{m === 'card' ? 'Cartão' : m === 'cash' ? 'Dinheiro' : 'PIX'}</span>
                              </label>
                          ))}
                      </div>
                  )}
              </div>

              <div className="p-4 bg-white border-t border-gray-200">
                  {step === 'cart' && <button onClick={() => setStep('address')} className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 transition-colors text-lg shadow-lg" style={{ backgroundColor: primaryColor }}>Continuar</button>}
                  {step === 'address' && <button onClick={() => setStep('payment')} disabled={!deliveryInfo?.valid} className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg" style={{ backgroundColor: primaryColor }}>Ir para Pagamento</button>}
                  {step === 'payment' && <button onClick={handlePlaceOrder} disabled={isSubmitting} className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 shadow-lg" style={{ backgroundColor: '#25D366' }}>{isSubmitting ? 'Enviando...' : `Finalizar Pedido (${formatMoney(finalTotal)})`}</button>}
              </div>
          </div>
      )}
    </div>
  )
}