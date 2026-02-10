"use client"

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, Upload, Loader2, Scissors, Plus, Trash2, GripVertical } from 'lucide-react'
import Cropper from 'react-easy-crop' 

// --- TIPOS ---
interface AddonOption {
  name: string
  price: number
}

interface AddonGroup {
  id: string
  title: string
  required: boolean
  max_options: number
  options: AddonOption[]
}

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductSaved: () => void
  restaurantId: string
  categories: { id: string, name: string }[]
  productToEdit?: any // Se vier preenchido, é EDIÇÃO
}

// --- FUNÇÕES DE IMAGEM ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') 
    image.src = url
  })

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise((resolve) => canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9))
}

export default function ProductModal({ isOpen, onClose, onProductSaved, restaurantId, categories, productToEdit }: ProductModalProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Dados do Produto
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  
  // COMPLEMENTOS (NOVO SISTEMA DE GRUPOS)
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([])

  const [isLoading, setIsLoading] = useState(false)
  
  // Crop de Imagem
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isCropping, setIsCropping] = useState(false)

  // --- CARREGAR DADOS AO ABRIR ---
  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        // MODO EDIÇÃO
        setName(productToEdit.name)
        setDescription(productToEdit.description || '')
        setPrice(productToEdit.price.toString())
        setCategoryId(productToEdit.category_id)
        setImageUrl(productToEdit.image_url)
        
        if (productToEdit.addons && Array.isArray(productToEdit.addons)) {
            if (productToEdit.addons.length > 0 && productToEdit.addons[0].title) {
                setAddonGroups(productToEdit.addons)
            } 
            else if (productToEdit.addons.length > 0) {
                setAddonGroups([{
                    id: crypto.randomUUID(),
                    title: "Adicionais",
                    required: false,
                    max_options: 0,
                    options: productToEdit.addons
                }])
            } else {
                setAddonGroups([])
            }
        } else {
            setAddonGroups([])
        }

      } else {
        // MODO CRIAÇÃO
        setName('')
        setDescription('')
        setPrice('')
        setAddonGroups([])
        setImageUrl(null)
        setCroppedImageBlob(null)
        setImageSrc(null)
        if (categories.length > 0) setCategoryId(categories[0].id)
      }
    }
  }, [isOpen, productToEdit, categories])

  // --- LÓGICA DE GRUPOS ---
  const addGroup = () => {
      setAddonGroups([...addonGroups, {
          id: crypto.randomUUID(),
          title: "",
          required: false,
          max_options: 0, 
          options: [{ name: "", price: 0 }]
      }])
  }

  const removeGroup = (index: number) => {
      const newGroups = [...addonGroups]
      newGroups.splice(index, 1)
      setAddonGroups(newGroups)
  }

  const updateGroup = (index: number, field: keyof AddonGroup, value: any) => {
      const newGroups = [...addonGroups]
      newGroups[index] = { ...newGroups[index], [field]: value }
      setAddonGroups(newGroups)
  }

  // --- LÓGICA DE OPÇÕES ---
  const addOptionToGroup = (groupIndex: number) => {
      const newGroups = [...addonGroups]
      newGroups[groupIndex].options.push({ name: "", price: 0 })
      setAddonGroups(newGroups)
  }

  const removeOptionFromGroup = (groupIndex: number, optionIndex: number) => {
      const newGroups = [...addonGroups]
      newGroups[groupIndex].options.splice(optionIndex, 1)
      setAddonGroups(newGroups)
  }

  const updateOption = (groupIndex: number, optionIndex: number, field: 'name' | 'price', value: string) => {
      const newGroups = [...addonGroups]
      const option = newGroups[groupIndex].options[optionIndex]
      if (field === 'price') option.price = parseFloat(value) || 0
      else option.name = value
      setAddonGroups(newGroups)
  }

  // --- IMAGEM ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.addEventListener('load', () => {
          setImageSrc(reader.result as string)
          setIsCropping(true)
      })
      reader.readAsDataURL(file)
    }
  }

  const showCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
    setCroppedImageBlob(blob)
    setIsCropping(false)
  }

  // --- SALVAR ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurantId || !categoryId) return alert("Categoria obrigatória!")
    setIsLoading(true)

    try {
        let finalUrl = imageUrl

        if (croppedImageBlob) {
            const fileName = `${Date.now()}-prod.jpg`
            const { error: upErr } = await supabase.storage.from('menu-images').upload(fileName, croppedImageBlob)
            if (upErr) throw upErr
            const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName)
            finalUrl = data.publicUrl
        }

        const cleanGroups = addonGroups.filter(g => g.title.trim() !== "").map(g => ({
            ...g,
            options: g.options.filter(o => o.name.trim() !== "")
        }))

        const payload = {
            restaurant_id: restaurantId,
            category_id: categoryId,
            name,
            description,
            price: parseFloat(price.replace(',', '.')),
            image_url: finalUrl,
            addons: cleanGroups
        }

        let error;
        if (productToEdit) {
            const { error: updateErr } = await supabase.from('products').update(payload).eq('id', productToEdit.id)
            error = updateErr
        } else {
            const { error: insertErr } = await supabase.from('products').insert(payload)
            error = insertErr
        }

        if (error) throw error

        onProductSaved()
        onClose()

    } catch (err) {
        console.error(err)
        alert("Erro ao salvar.")
    } finally {
        setIsLoading(false)
    }
  }

  if (!isOpen) return null

  // TELA DE CROP
  if (isCropping) {
      return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col h-screen">
            <div className="p-4 flex justify-between text-white bg-gray-900">
                <span>Ajustar Foto</span>
                <button onClick={() => setIsCropping(false)}><X /></button>
            </div>
            <div className="relative flex-1 bg-gray-800">
                <Cropper image={imageSrc || ''} crop={crop} zoom={zoom} aspect={4/3} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, p) => setCroppedAreaPixels(p)} />
            </div>
            <div className="p-4 bg-white">
                <button onClick={showCroppedImage} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl">Confirmar Recorte</button>
            </div>
        </div>
      )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <h2 className="font-bold text-xl text-gray-800">{productToEdit ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* IMAGEM E CAMPOS PRINCIPAIS */}
          <div className="flex flex-col sm:flex-row gap-6 items-start">
             {/* Área de Upload */}
             <div className="w-full sm:w-32 h-32 flex-shrink-0 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors">
                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 z-10 cursor-pointer"/>
                {croppedImageBlob ? (
                    <img src={URL.createObjectURL(croppedImageBlob)} className="w-full h-full object-cover" />
                ) : imageUrl ? (
                    <img src={imageUrl} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-gray-500 text-xs font-medium"><Upload className="mx-auto mb-1 text-gray-400" size={24}/>Adicionar<br/>Foto</div>
                )}
                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold transition-opacity">Alterar</div>
             </div>

             <div className="flex-1 w-full space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome do Produto</label>
                    <input 
                        required 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full border border-gray-300 p-3 rounded-lg font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all" 
                        placeholder="Ex: X-Bacon Supremo" 
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descrição</label>
                    <textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        className="w-full border border-gray-300 p-3 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 resize-none outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all" 
                        rows={2} 
                        placeholder="Ex: Pão brioche, burger 180g, bacon crocante e queijo cheddar..." 
                    />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Preço (R$)</label>
                <input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={price} 
                    onChange={e => setPrice(e.target.value)} 
                    className="w-full border border-gray-300 p-3 rounded-lg font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all" 
                    placeholder="0.00" 
                />
             </div>
             <div>
                <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Categoria</label>
                <div className="relative">
                    <select 
                        required 
                        value={categoryId} 
                        onChange={e => setCategoryId(e.target.value)} 
                        className="w-full border border-gray-300 p-3 rounded-lg bg-white font-medium text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 appearance-none"
                    >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
             </div>
          </div>

          <hr className="border-gray-200"/>

          {/* ÁREA DE COMPLEMENTOS (GRUPOS) */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-gray-800 text-sm uppercase flex items-center gap-2">
                    <Scissors size={18} className="text-red-500"/> 
                    Complementos
                  </h3>
                  <button type="button" onClick={addGroup} className="text-xs bg-white border border-gray-300 hover:border-red-500 hover:text-red-600 font-bold px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-sm">
                      <Plus size={16} /> Novo Grupo
                  </button>
              </div>

              {addonGroups.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl bg-white">
                      <p className="text-gray-500 text-sm font-medium">Nenhum complemento adicionado.</p>
                      <p className="text-gray-400 text-xs mt-1">Crie grupos como "Ponto da Carne", "Adicionais" ou "Bebidas".</p>
                  </div>
              )}

              <div className="space-y-5">
                  {addonGroups.map((group, gIndex) => (
                      <div key={group.id || gIndex} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
                          {/* Header do Grupo */}
                          <div className="bg-gray-100/50 p-3 border-b border-gray-200 flex flex-wrap gap-3 items-center">
                              <GripVertical size={20} className="text-gray-400 cursor-move" />
                              <div className="flex-1 min-w-[200px]">
                                <input 
                                    placeholder="Nome do Grupo (Ex: Escolha o Molho)" 
                                    value={group.title} 
                                    onChange={e => updateGroup(gIndex, 'title', e.target.value)}
                                    className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-red-400 rounded px-2 py-1 font-bold text-gray-800 placeholder:text-gray-400 focus:ring-0 transition-all"
                                />
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs border-l border-gray-300 pl-4">
                                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-200 px-2 py-1 rounded transition-colors">
                                      <input 
                                        type="checkbox" 
                                        checked={group.required} 
                                        onChange={e => updateGroup(gIndex, 'required', e.target.checked)} 
                                        className="rounded text-red-600 focus:ring-red-500 w-4 h-4 border-gray-300"
                                      />
                                      <span className="font-bold text-gray-700">Obrigatório</span>
                                  </label>
                                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200" title="Máximo de opções">
                                      <span className="font-bold text-gray-500">Max:</span>
                                      <input 
                                          type="number" 
                                          value={group.max_options || ''} 
                                          onChange={e => updateGroup(gIndex, 'max_options', parseInt(e.target.value))}
                                          className="w-12 p-0.5 border-none text-center font-bold text-gray-800 outline-none focus:ring-0"
                                          placeholder="∞"
                                      />
                                  </div>
                                  <button type="button" onClick={() => removeGroup(gIndex)} className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                              </div>
                          </div>

                          {/* Lista de Opções */}
                          <div className="p-3 space-y-3 bg-white">
                              {group.options.map((option, oIndex) => (
                                  <div key={oIndex} className="flex gap-3 items-center pl-2 group/opt">
                                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full group-hover/opt:bg-red-400 transition-colors"></div>
                                      <input 
                                          placeholder="Nome da Opção (Ex: Maionese Verde)" 
                                          value={option.name} 
                                          onChange={e => updateOption(gIndex, oIndex, 'name', e.target.value)}
                                          className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-400 focus:ring-1 focus:ring-red-100 outline-none transition-all"
                                      />
                                      <div className="relative w-24">
                                          <span className="absolute left-2 top-2 text-xs text-gray-500 font-bold">R$</span>
                                          <input 
                                              type="number" 
                                              placeholder="0.00" 
                                              value={option.price} 
                                              onChange={e => updateOption(gIndex, oIndex, 'price', e.target.value)}
                                              className="w-full border border-gray-200 rounded px-2 py-2 pl-6 text-sm font-bold text-gray-900 focus:border-red-400 focus:ring-1 focus:ring-red-100 outline-none transition-all"
                                          />
                                      </div>
                                      <button type="button" onClick={() => removeOptionFromGroup(gIndex, oIndex)} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded transition-colors"><X size={16}/></button>
                                  </div>
                              ))}
                              <button type="button" onClick={() => addOptionToGroup(gIndex)} className="text-xs text-blue-600 font-bold hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg mt-1 flex items-center gap-1 transition-colors">
                                  <Plus size={14}/> Adicionar Opção
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

        </form>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
            <button onClick={onClose} className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 hover:text-gray-800 rounded-lg transition-colors">Cancelar</button>
            <button onClick={handleSubmit} disabled={isLoading} className="px-8 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Produto'}
            </button>
        </div>

      </div>
    </div>
  )
}