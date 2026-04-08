import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Mail, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

async function getUserData() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return { user }
}

export default async function SettingsPage() {
  const { user } = await getUserData()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-gray-600 mt-1">Gestisci il tuo account e le preferenze</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Profilo Utente</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gray-400" />
                <p className="text-gray-900">{user.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">ID Utente</label>
              <p className="text-sm text-gray-600 font-mono break-all">{user.id}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Data Registrazione</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <p className="text-gray-900">
                  {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: it })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Informazioni Applicazione</h2>
          
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span>Versione</span>
              <span className="font-medium text-gray-900">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span>Framework</span>
              <span className="font-medium text-gray-900">Next.js 14</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span>Database</span>
              <span className="font-medium text-gray-900">Supabase</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Hosting</span>
              <span className="font-medium text-gray-900">Vercel</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notifiche</h2>
          <p className="text-gray-600 mb-4">
            Le notifiche per scadenze imminenti sono abilitate automaticamente nella dashboard.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Suggerimento:</strong> Controlla regolarmente la dashboard per vedere le scadenze in arrivo nei prossimi 7 giorni.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
