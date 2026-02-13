"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  Store,
  Ticket,
  Users,
  Star,
  History 
} from "lucide-react"

const MENU_ITEMS = [
  { name: "Visão Geral", href: "/admin", icon: LayoutDashboard },
  { name: "Pedidos", href: "/admin/orders", icon: ShoppingBag }, // Seu gestor atual
  { name: "Histórico", href: "/admin/history", icon: History },  // A tabela nova
  { name: "Cardápio", href: "/admin/menu", icon: UtensilsCrossed },
  { name: "Clientes", href: "/admin/clients", icon: Users },
  { name: "Avaliações", href: "/admin/reviews", icon: Star },
  { name: "Cupons", href: "/admin/coupons", icon: Ticket },
  { name: "Configurações", href: "/admin/settings", icon: Settings },
]

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

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-50">
      <div className="p-6 border-b border-gray-100 flex items-center gap-2">
        <div className="bg-red-600 p-2 rounded-lg text-white shadow-md">
          <Store size={20} />
        </div>
        <span className="font-bold text-gray-800 text-lg tracking-tight">Gestor Delivery</span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <p className="px-4 text-xs font-bold text-gray-400 uppercase mb-2 mt-2">Principal</p>
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm cursor-pointer ${isActive ? "bg-red-50 text-red-600 shadow-sm border border-red-100" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
              <item.icon size={20} className={isActive ? "text-red-600" : "text-gray-400"} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all font-medium text-sm">
          <LogOut size={20} /> Sair
        </button>
      </div>
    </aside>
  )
}