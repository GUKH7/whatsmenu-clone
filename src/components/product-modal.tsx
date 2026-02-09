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
        // MODO EDIÇÃO: Preenche tudo
        setName(productToEdit.name)
        setDescription(productToEdit.description || '')
        setPrice(productToEdit.price.toString())
        setCategoryId(productToEdit.category_id)
        setImageUrl(productToEdit.image_url)
        
        // Verifica se tem addons e se estão no formato novo
        if (productToEdit.addons && Array.isArray(productToEdit.addons)) {
            // Se o primeiro item tem 'title', é o formato novo de grupos
            if (productToEdit.addons.length > 0 && productToEdit.addons[0].title) {
                setAddonGroups(productToEdit.addons)
            } 
            // Se tem addons mas não tem título, é o formato antigo -> converte para um grupo "Geral"
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
        // MODO CRIAÇÃO: Limpa tudo
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

        // Upload da Imagem (se houve alteração)
        if (croppedImageBlob) {
            const fileName = `${Date.now()}-prod.jpg`
            const { error: upErr } = await supabase.storage.from('menu-images').upload(fileName, croppedImageBlob)
            if (upErr) throw upErr
            const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName)
            finalUrl = data.publicUrl
        }

        // Limpa grupos vazios antes de salvar
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
            // UPDATE
            const { error: updateErr } = await supabase.from('products').update(payload).eq('id', productToEdit.id)
            error = updateErr
        } else {
            // INSERT
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
        
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-2xl">
          <h2 className="font-bold text-lg text-gray-800">{productToEdit ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* IMAGEM */}
          <div className="flex gap-4 items-start">
             <div className="w-32 h-24 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-red-400 transition-colors">
                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 z-10 cursor-pointer"/>
                {croppedImageBlob ? (
                    <img src={URL.createObjectURL(croppedImageBlob)} className="w-full h-full object-cover" />
                ) : imageUrl ? (
                    <img src={imageUrl} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-gray-400 text-xs"><Upload className="mx-auto mb-1" size={20}/>Foto</div>
                )}
                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white text-xs font-bold">Alterar</div>
             </div>
             <div className="flex-1 space-y-3">
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg font-bold outline-none focus:ring-2 focus:ring-red-100" placeholder="Nome do Produto (Ex: X-Bacon)" />
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-red-100" rows={2} placeholder="Descrição..." />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Preço (R$)</label>
                <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-red-100" placeholder="0.00" />
             </div>
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Categoria</label>
                <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-red-100">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
          </div>

          <hr className="border-gray-100"/>

          {/* ÁREA DE COMPLEMENTOS (GRUPOS) */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 text-sm uppercase">Complementos e Adicionais</h3>
                  <button type="button" onClick={addGroup} className="text-xs bg-white border border-gray-300 hover:border-red-500 hover:text-red-600 font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-sm">
                      <Plus size={14} /> Novo Grupo
                  </button>
              </div>

              {addonGroups.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg text-gray-400 text-xs">
                      Nenhum grupo de complemento criado.<br/>(Ex: Ponto da Carne, Adicionais, Bebidas)
                  </div>
              )}

              <div className="space-y-4">
                  {addonGroups.map((group, gIndex) => (
                      <div key={group.id || gIndex} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                          {/* Header do Grupo */}
                          <div className="bg-gray-100 p-2 border-b border-gray-200 flex flex-wrap gap-2 items-center">
                              <GripVertical size={16} className="text-gray-400" />
                              <input 
                                  placeholder="Título do Grupo (Ex: Escolha o Ponto)" 
                                  value={group.title} 
                                  onChange={e => updateGroup(gIndex, 'title', e.target.value)}
                                  className="flex-1 bg-transparent border-none font-bold text-sm focus:ring-0 placeholder-gray-500 text-gray-800"
                              />
                              <div className="flex items-center gap-3 text-xs border-l border-gray-300 pl-3">
                                  <label className="flex items-center gap-1 cursor-pointer hover:bg-gray-200 p-1 rounded">
                                      <input type="checkbox" checked={group.required} onChange={e => updateGroup(gIndex, 'required', e.target.checked)} className="rounded text-red-600 focus:ring-red-500"/>
                                      Obrigatório
                                  </label>
                                  <div className="flex items-center gap-1" title="Máximo de opções que o cliente pode selecionar">
                                      <span>Max:</span>
                                      <input 
                                          type="number" 
                                          value={group.max_options || ''} 
                                          onChange={e => updateGroup(gIndex, 'max_options', parseInt(e.target.value))}
                                          className="w-10 p-0.5 border rounded text-center text-xs"
                                          placeholder="∞"
                                      />
                                  </div>
                                  <button type="button" onClick={() => removeGroup(gIndex)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
                              </div>
                          </div>

                          {/* Lista de Opções */}
                          <div className="p-2 space-y-2">
                              {group.options.map((option, oIndex) => (
                                  <div key={oIndex} className="flex gap-2 items-center pl-2">
                                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                                      <input 
                                          placeholder="Nome da Opção (Ex: Bem Passado)" 
                                          value={option.name} 
                                          onChange={e => updateOption(gIndex, oIndex, 'name', e.target.value)}
                                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:border-red-400 outline-none"
                                      />
                                      <div className="relative w-20">
                                          <span className="absolute left-1 top-1.5 text-xs text-gray-400">R$</span>
                                          <input 
                                              type="number" 
                                              placeholder="0.00" 
                                              value={option.price} 
                                              onChange={e => updateOption(gIndex, oIndex, 'price', e.target.value)}
                                              className="w-full border border-gray-200 rounded px-1 py-1 pl-5 text-sm focus:border-red-400 outline-none"
                                          />
                                      </div>
                                      <button type="button" onClick={() => removeOptionFromGroup(gIndex, oIndex)} className="text-gray-300 hover:text-red-500 p-1"><X size={16}/></button>
                                  </div>
                              ))}
                              <button type="button" onClick={() => addOptionToGroup(gIndex)} className="text-xs text-blue-600 font-bold hover:underline mt-1 pl-4 flex items-center gap-1">
                                  <Plus size={12}/> Adicionar Opção
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

        </form>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
            <button onClick={onClose} className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Cancelar</button>
            <button onClick={handleSubmit} disabled={isLoading} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-200">
                {isLoading ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
            </button>
        </div>

      </div>
    </div>
  )
}