'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Plus, Pizza, Trash2 } from 'lucide-react';
import NewProductModal from '@/components/NewProductModal';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Função para buscar os produtos do banco
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        await fetchProducts(); // Busca produtos assim que logar
        setLoading(false);
      }
    };
    checkUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que quer apagar esse produto?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts(); // Atualiza a lista
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando painel...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-green-600 p-2 rounded-lg">
            <Pizza className="text-white h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Painel do Zé</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:inline">{user?.email}</span>
          <button onClick={handleLogout} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Seus Produtos ({products.length})</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" /> Novo Produto
          </button>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pizza className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Nenhum produto cadastrado</h3>
            <p className="text-gray-500 mt-1">Comece adicionando o primeiro item do seu cardápio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 bg-gray-200 relative">
                  {/* Imagem do produto */}
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                      R$ {product.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex justify-end pt-4 border-t border-gray-50">
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Excluir produto"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Nossa Janelinha de Cadastro */}
      <NewProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onUpdate={fetchProducts}
      />
    </div>
  );
}