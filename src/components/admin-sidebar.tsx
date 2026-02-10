"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Store, UtensilsCrossed, Settings, LogOut, ShoppingBag, Users } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  // Função para saber se o link está ativo (deixa vermelho)
  const isActive = (path: string) => pathname === path

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col fixed left-0 top-0 z-50">
      
      {/* Logo da Área Admin */}
      <div className="p-6 border-b border-gray-100 flex items-center gap-2">
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
          W
        </div>
        <span className="font-bold text-gray-800 text-lg">Gestor</span>
      </div>

      {/* Links de Navegação */}
      <nav className="flex-1 p-4 space-y-1">
        
        <p className="px-4 text-xs font-bold text-gray-400 uppercase mb-2 mt-2">Principal</p>
        
        <Link href="/admin">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium cursor-pointer
            ${isActive('/admin') ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <UtensilsCrossed size={20} />
            Cardápio
          </div>
        </Link>

        <Link href="/admin/orders">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium cursor-pointer
            ${isActive('/admin/orders') ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <ShoppingBag size={20} />
            Pedidos <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded-full ml-auto">Em breve</span>
          </div>
        </Link>

        <p className="px-4 text-xs font-bold text-gray-400 uppercase mb-2 mt-6">Gestão</p>

        <Link href="/admin/settings">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium cursor-pointer
            ${isActive('/admin/settings') ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Settings size={20} />
            Configurações
          </div>
        </Link>

        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 cursor-not-allowed hover:bg-gray-50 opacity-60" title="Em breve">
            <Users size={20} />
            Clientes
        </div>

      </nav>

      {/* Botão Sair */}
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors font-medium"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </aside>
  )
}