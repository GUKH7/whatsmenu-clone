"use client"

import { useState, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react'

function AuthContent() {
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

  const handleGoBack = () => {
    const parts = returnUrl.split('/').filter(Boolean)
    
    if (parts.length > 0) {
        const slug = parts[0]
        
        // Impede que o sistema tente voltar para a própria tela de login ou se confunda
        if (slug === 'auth' || slug === 'minha-conta') {
            router.push('/') 
        } else {
            router.push(`/${slug}`) // Manda direto pro cardápio
        }
    } else {
        router.push('/') // Fallback de segurança
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        // Tenta Logar
        const { error } = await supabase.auth.signInWithPassword({ 
            email: formData.email, 
            password: formData.password 
        })
        if (error) throw error
      } else {
        // Cria a conta (Como desativamos a confirmação no Supabase, ele já loga automático!)
        const { error } = await supabase.auth.signUp({ 
            email: formData.email, 
            password: formData.password 
        })
        if (error) throw error
      }
      
      // Manda o cliente de volta pro carrinho ou cardápio instantaneamente
      router.push(decodeURIComponent(returnUrl))
      router.refresh()

    } catch (error: any) {
      alert(error.message || "Erro na autenticação. Verifique seus dados.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-sm border border-gray-100">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6 text-sm">
            <ArrowLeft size={16}/> Voltar
        </button>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
            {isLogin ? 'Acessar Conta' : 'Criar Conta'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
            {isLogin ? 'Faça login para continuar seu pedido.' : 'Crie sua conta em 5 segundos.'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-gray-400" size={20}/>
              <input type="email" required placeholder="Seu melhor email" className="w-full pl-10 p-3 border rounded-xl outline-none focus:border-red-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/>
          </div>
          <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={20}/>
              <input type="password" required placeholder="Crie uma senha (mín. 6 letras/números)" minLength={6} className="w-full pl-10 p-3 border rounded-xl outline-none focus:border-red-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
          </div>
          <button disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors mt-2">
              {loading ? <Loader2 className="animate-spin"/> : isLogin ? 'Entrar e Pedir' : 'Cadastrar e Pedir'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-gray-600 text-sm hover:text-gray-900">
                {isLogin ? 'Ainda não tem conta? ' : 'Já tem uma conta? '}
                <span className="text-red-600 font-bold hover:underline">
                    {isLogin ? 'Cadastre-se' : 'Faça login'}
                </span>
            </button>
        </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <Suspense fallback={<div className="flex justify-center"><Loader2 className="animate-spin text-red-600"/></div>}>
        <AuthContent />
      </Suspense>
    </div>
  )
}