"use client"

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail, Store } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert('Erro: ' + error.message)
      setLoading(false)
    } else {
      router.push('/admin')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
            <div className="bg-red-600 p-3 rounded-xl text-white mb-2"><Store size={24}/></div>
            <h1 className="text-xl font-bold text-gray-800">Painel do Lojista</h1>
            <p className="text-sm text-gray-500 mt-1">Acesse sua loja</p>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-gray-400" size={20}/>
            <input type="email" required placeholder="Email" className="w-full pl-10 p-3 border rounded-xl outline-none focus:border-red-500" value={email} onChange={e => setEmail(e.target.value)}/>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-gray-400" size={20}/>
            <input type="password" required placeholder="Senha" className="w-full pl-10 p-3 border rounded-xl outline-none focus:border-red-500" value={password} onChange={e => setPassword(e.target.value)}/>
          </div>
          <button disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin"/> : 'Entrar no Painel'}
          </button>
        </div>
      </form>
    </div>
  )
}