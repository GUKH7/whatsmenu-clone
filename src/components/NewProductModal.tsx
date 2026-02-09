"use client"

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, Upload, Loader2, Scissors, Plus, Trash2 } from 'lucide-react'
import Cropper from 'react-easy-crop' 

// --- TIPOS ---
interface Addon {
  name: string
  price: number
}

interface NewProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductCreated: () => void // Mudamos onSave para onProductCreated para manter seu padrão
  restaurantId: string
  categories?: { id: string, name: string }[] // Opcional, caso venha de fora
}

// --- 1. FUNÇÕES AUXILIARES DE CORTE ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') 
    image.src = url
  })

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) return null

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob)
    }, 'image/jpeg', 0.9)
  })
}

// --- 2. O COMPONENTE DO MODAL ---
export default function NewProductModal({ isOpen, onClose, onProductCreated, restaurantId, categories: propCategories }: NewProductModalProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<any[]>(propCategories || [])
  const [isLoading, setIsLoading] = useState(false)

  // Estados de Complementos (Addons)
  const [addons, setAddons] = useState<Addon[]>([])

  // Estados da Imagem e Crop
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isCropping, setIsCropping] = useState(false)

  // Busca categorias se não vierem via props
  useEffect(() => {
    if (isOpen) {
      // Resetar form
      setName('')
      setDescription('')
      setPrice('')
      setCategoryId('')
      setAddons([])
      setImageSrc(null)
      setCroppedImageBlob(null)
      
      if (restaurantId && (!propCategories || propCategories.length === 0)) {
        const fetchCategories = async () => {
          const { data } = await supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('order')
          if (data) {
             setCategories(data)
             if(data.length > 0) setCategoryId(data[0].id)
          }
        }
        fetchCategories()
      } else if (propCategories && propCategories.length > 0) {
          setCategoryId(propCategories[0].id)
      }
    }
  }, [isOpen, restaurantId, propCategories, supabase])

  // --- LÓGICA DE ADDONS ---
  const addAddonField = () => setAddons([...addons, { name: "", price: 0 }])
  
  const removeAddon = (index: number) => {
    const newAddons = [...addons]
    newAddons.splice(index, 1)
    setAddons(newAddons)
  }

  const updateAddon = (index: number, field: 'name' | 'price', value: string) => {
    const newAddons = [...addons]
    if (field === 'price') {
        newAddons[index].price = parseFloat(value) || 0
    } else {
        newAddons[index].name = value
    }
    setAddons(newAddons)
  }

  // --- LÓGICA DE IMAGEM ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const imageDataUrl = await readFile(file)
      setImageSrc(imageDataUrl as string)
      setIsCropping(true)
    }
  }

  const readFile = (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(reader.result))
      reader.readAsDataURL(file)
    })
  }

  const showCroppedImage = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      setCroppedImageBlob(croppedBlob)
      setIsCropping(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurantId || !categoryId) return alert("Selecione uma categoria!")
    setIsLoading(true)

    try {
        let finalImageUrl = null

        // 1. Upload da Imagem (se houver)
        if (croppedImageBlob) {
            const fileName = `${Date.now()}-produto.jpg`
            const { error: uploadError } = await supabase
                .storage
                .from('menu-images')
                .upload(fileName, croppedImageBlob)

            if (uploadError) throw uploadError

            const { data: publicUrlData } = supabase
                .storage
                .from('menu-images')
                .getPublicUrl(fileName)
            
            finalImageUrl = publicUrlData.publicUrl
        }

        // 2. Filtra addons vazios
        const cleanAddons = addons.filter(a => a.name.trim() !== "")

        // 3. Salva no Banco
        const { error } = await supabase.from('products').insert({
          restaurant_id: restaurantId,
          category_id: categoryId,
          name,
          description,
          price: parseFloat(price.replace(',', '.')),
          image_url: finalImageUrl,
          addons: cleanAddons // Salva o JSON aqui
        })

        if (error) throw error

        onProductCreated() // Avisa o pai
        onClose() // Fecha

    } catch (err) {
        console.error(err)
        alert("Erro ao salvar.")
    } finally {
        setIsLoading(false)
    }
  }

  const handleClose = () => {
    setImageSrc(null)
    setCroppedImageBlob(null)
    setIsCropping(false)
    onClose()
  }

  if (!isOpen) return null

  // --- TELA DE CORTE (CROPPER) ---
  if (isCropping) {
    return (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col h-[100dvh]">
            <div className="flex justify-between items-center p-4 text-white z-10 bg-black/50">
                <h3 className="font-bold">Ajuste a Foto</h3>
                <button onClick={() => setIsCropping(false)}><X /></button>
            </div>
            
            <div className="relative flex-1 bg-gray-900 w-full">
                <Cropper
                    image={imageSrc || ''}
                    crop={crop}
                    zoom={zoom}
                    aspect={4 / 3}
                    onCropChange={setCrop}
                    onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                    onZoomChange={setZoom}
                />
            </div>

            <div className="p-6 bg-white flex flex-col gap-4 z-10">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">Zoom</span>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <button 
                    onClick={showCroppedImage}
                    className="w-full bg-green-600 text-white font-bold py-3 rounded-xl"
                >
                    Confirmar Recorte
                </button>
            </div>
        </div>
    )
  }

  // --- TELA DO FORMULÁRIO ---
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="font-bold text-lg text-gray-800">Novo Produto</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Upload de Imagem */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Foto do Produto</label>
            {!croppedImageBlob ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative group bg-gray-50">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-red-500 transition-colors">
                        <Upload size={32} />
                        <span className="text-sm font-medium">Toque para adicionar foto</span>
                    </div>
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm group h-48 bg-gray-100">
                    <img src={URL.createObjectURL(croppedImageBlob)} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => { setCroppedImageBlob(null); setIsCropping(false); }} className="bg-white text-red-600 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gray-100 transform scale-100 active:scale-95 transition-all">
                            <Scissors size={16} /> Trocar Foto
                        </button>
                    </div>
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500/50" placeholder="Ex: X-Bacon" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Preço (R$)</label>
                <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500/50" placeholder="0,00" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
            <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border p-2.5 rounded-lg outline-none bg-white focus:ring-2 focus:ring-red-500/50">
                <option value="">Selecione...</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-red-500/50 resize-none" rows={3} placeholder="Ingredientes e detalhes..." />
          </div>

          {/* SEÇÃO DE COMPLEMENTOS (NOVA) */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Complementos</h3>
                    <button 
                        type="button"
                        onClick={addAddonField}
                        className="text-xs bg-white border border-gray-300 hover:border-green-500 hover:text-green-600 font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-sm"
                    >
                        <Plus size={14} /> Adicionar
                    </button>
                </div>

                {addons.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                        Nenhum complemento (ex: Bacon extra).
                    </p>
                ) : (
                    <div className="space-y-2">
                        {addons.map((addon, index) => (
                            <div key={index} className="flex items-center gap-2 animate-in slide-in-from-left-2">
                                <input 
                                    placeholder="Nome (Ex: Bacon)" 
                                    value={addon.name}
                                    onChange={e => updateAddon(index, 'name', e.target.value)}
                                    className="flex-1 border p-2 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                />
                                <div className="relative w-24">
                                    <span className="absolute left-2 top-2 text-gray-400 text-xs">R$</span>
                                    <input 
                                        type="number" 
                                        placeholder="0.00" 
                                        value={addon.price}
                                        onChange={e => updateAddon(index, 'price', e.target.value)}
                                        className="w-full border p-2 pl-6 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => removeAddon(index)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
          </div>

        </form>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
             <button 
                onClick={handleClose}
                className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={isLoading} 
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-green-200 active:scale-[0.98] transition-all"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Salvar Produto'}
            </button>
        </div>

      </div>
    </div>
  )
}