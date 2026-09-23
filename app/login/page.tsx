'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, Mail, User, ArrowRight } from 'lucide-react'
import SuryaChakraLogo from '@/components/SuryaChakraLogo'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setInfoMsg(null)

    try {
      if (isSignUp) {
        const displayName = username.trim() || email.split('@')[0]
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: displayName,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) {
          setErrorMsg(error.message)
        } else if (data.session) {
          router.push('/')
          router.refresh()
        } else {
          setInfoMsg('Account created successfully! Check your email for confirmation or sign in.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          setErrorMsg(error.message)
        } else {
          router.push('/')
          router.refresh()
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative solar glow background shapes */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-200/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-orange-200/30 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Light Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xl shadow-slate-200/60 z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <SuryaChakraLogo className="w-12 h-12 shadow-sm rounded-full" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Nakshatra AI
          </h1>
          <p className="text-xs text-amber-700 tracking-widest uppercase mt-1 font-semibold">
            Indian Astronomy & Astronomical Traditions
          </p>
        </div>

        {/* Toggle Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false)
              setErrorMsg(null)
              setInfoMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isSignUp
                ? 'bg-white text-amber-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true)
              setErrorMsg(null)
              setInfoMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isSignUp
                ? 'bg-white text-amber-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username field shown during Sign Up */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Username / Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Aryabhata, Shubham..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="astronomer@aryabhata.in"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-amber-600/20 transition flex items-center justify-center gap-2 group disabled:opacity-50 text-xs"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>{isSignUp ? 'Create Scholar Account' : 'Explore Astronomy'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
