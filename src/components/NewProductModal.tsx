'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { X, Loader2 } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function NewProductModal({ isOpen, onClose, onUpdate }: ModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Busca as categorias assim que a janela abre
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data && data.length > 0) {
        setCategories(data);
        setCategoryId(data[0].id); // Já seleciona a primeira pra facilitar
      }
    };
    
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: restaurant } = await supabase.from('restaurants').select('id').single();

    if (!restaurant) {
      alert('Erro: Restaurante não encontrado!');
      setLoading(false);
      return;
    }

    if (!categoryId) {
      alert('Erro: Você precisa ter pelo menos uma categoria cadastrada!');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('products').insert([
      {
        name,
        description,
        price: parseFloat(price.replace(',', '.')),
        restaurant_id: restaurant.id,
        category_id: categoryId, // <--- O segredo está aqui!
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=60'
      }
    ]);

    if (error) {
      alert('Erro ao criar: ' + error.message);
    } else {
      setName('');
      setDescription('');
      setPrice('');
      onUpdate();
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Novo Produto</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletor de Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 outline-none" placeholder="Ex: X-Bacon" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 outline-none" rows={3} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
            <input required type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 outline-none" placeholder="0.00" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex justify-center">
            {loading ? <Loader2 className="animate-spin" /> : 'Salvar Produto'}
          </button>
        </form>
      </div>
    </div>
  );
}