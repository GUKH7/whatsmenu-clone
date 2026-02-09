"use client"

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, Upload, Loader2, Scissors } from 'lucide-react'
import Cropper from 'react-easy-crop' 

// --- 1. FUNÇÕES AUXILIARES DE CORTE (Estão aqui dentro agora!) ---
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
interface NewProductModalProps {
  isOpen: boolean
  onClose: () => void
  onProductCreated: () => void
  restaurantId: string
}

export default function NewProductModal({ isOpen, onClose, onProductCreated, restaurantId }: NewProductModalProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Estados da Imagem e Crop
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isCropping, setIsCropping] = useState(false)

  useEffect(() => {
    if (isOpen && restaurantId) {
      const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').eq('restaurant_id', restaurantId)
        if (data) setCategories(data)
      }
      fetchCategories()
    }
  }, [isOpen, restaurantId, supabase])

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

        const { error } = await supabase.from('products').insert({
          restaurant_id: restaurantId,
          category_id: categoryId,
          name,
          description,
          price: parseFloat(price.replace(',', '.')),
          image_url: finalImageUrl
        })

        if (error) throw error

        setName(''); setDescription(''); setPrice(''); 
        setCroppedImageBlob(null); setImageSrc(null);
        onProductCreated()
        onClose()

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
        <div className="fixed inset-0 bg-black z-50 flex flex-col h-[100dvh]">
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="font-bold text-lg text-gray-800">Novo Produto</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Foto do Produto</label>
            {!croppedImageBlob ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative group">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-gray-600">
                        <Upload size={32} />
                        <span className="text-sm font-medium">Toque para escolher</span>
                    </div>
                </div>
            ) : (
                <div className="relative rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                    <img src={URL.createObjectURL(croppedImageBlob)} alt="Preview" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => { setCroppedImageBlob(null); setIsCropping(false); }} className="bg-white text-red-500 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gray-100">
                            <Scissors size={16} /> Trocar Foto
                        </button>
                    </div>
                </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700">Nome</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg mt-1" placeholder="Ex: X-Bacon" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded-lg mt-1 resize-none" rows={2} placeholder="Ingredientes..." />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700">Preço (R$)</label>
                <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full border p-2 rounded-lg mt-1" placeholder="0,00" />
            </div>
            
            <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700">Categoria</label>
                <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border p-2 rounded-lg mt-1 bg-white">
                    <option value="">Selecione...</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl mt-4 flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="animate-spin" /> : 'Salvar Produto'}
          </button>
        </form>
      </div>
    </div>
  )
}