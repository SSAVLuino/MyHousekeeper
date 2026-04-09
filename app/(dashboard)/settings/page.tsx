'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Mail, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const handleCopy = () => {
    if (user) {
      navigator.clipboard.writeText(user.id)
      alert('ID copiato negli appunti!')
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-gray-600 mt-1">Gestisci il tuo account e le preferenze</p>
      </div>

      <div className="space-y-6">
        {/* Informazioni Account */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Informazioni Account</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">ID Utente</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-900">
                    {user.id}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Copia
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Condividi questo ID per essere aggiunto ai progetti
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900 font-medium">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Account creato il</p>
                <p className="text-gray-900 font-medium">
                  {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: it })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Stato Email</p>
                <p className="text-gray-900 font-medium">
                  {user.email_confirmed_at ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verificata
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Non verificata
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Informazioni Utilizzo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Informazioni Applicazione</h2>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Versione</dt>
                <dd className="text-lg font-semibold text-gray-900 mt-1">1.0.0</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Database</dt>
                <dd className="text-lg font-semibold text-gray-900 mt-1">Supabase</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Framework</dt>
                <dd className="text-lg font-semibold text-gray-900 mt-1">Next.js 14</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Hosting</dt>
                <dd className="text-lg font-semibold text-gray-900 mt-1">Vercel</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
