"use client"

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/' 

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email: formData.email, password: formData.password })
        if (error) throw error
        alert("Conta criada! Verifique seu email ou faça login.")
      }
      
      router.push(decodeURIComponent(returnUrl))
      router.refresh()

    } catch (error: any) {
      alert(error.message || "Erro na autenticação")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-sm border border-gray-100">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6 text-sm"><ArrowLeft size={16}/> Voltar</button>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{isLogin ? 'Acessar Conta' : 'Criar Conta'}</h1>
        <form onSubmit={handleAuth} className="space-y-4 mt-6">
          <div className="relative"><Mail className="absolute left-3 top-3.5 text-gray-400" size={20}/><input type="email" required placeholder="Email" className="w-full pl-10 p-3 border rounded-xl outline-none focus:border-red-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/></div>
          <div className="relative"><Lock className="absolute left-3 top-3.5 text-gray-400" size={20}/><input type="password" required placeholder="Senha" className="w-full pl-10 p-3 border rounded-xl outline-none focus:border-red-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/></div>
          <button disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin"/> : isLogin ? 'Entrar' : 'Cadastrar'}</button>
        </form>
        <div className="mt-6 text-center"><button onClick={() => setIsLogin(!isLogin)} className="text-red-600 font-bold hover:underline">{isLogin ? 'Criar nova conta' : 'Já tenho conta'}</button></div>
      </div>
    </div>
  )
}