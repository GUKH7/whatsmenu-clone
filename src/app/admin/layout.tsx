import AdminSidebar from "@/components/admin-sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-[#F2F4F7]">
      {/* Menu Lateral Fixo */}
      <AdminSidebar />

      {/* Área de Conteúdo (que muda conforme a página) */}
      <div className="flex-1 ml-64 p-8">
        {children}
      </div>
    </div>
  )
}