import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Zap, Check } from 'lucide-react'
import Image from 'next/image'

async function getUserData() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return { user }
}

export default async function UpgradePage() {
  const { user } = await getUserData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-green-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header con logo */}
        <div className="mb-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alla dashboard
          </Link>
          
          <div className="flex justify-center mb-6">
            <Image
              src="/scadix.png"
              alt="Scadix Logo"
              width={120}
              height={120}
              className="rounded-2xl shadow-lg"
              priority
            />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Passa a Scadix Premium
          </h1>
          <p className="text-xl text-gray-600">
            Sblocca tutte le funzionalità avanzate
          </p>
        </div>

        {/* Card principale */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Sezione Premium */}
          <div className="bg-gradient-to-r from-primary-600 to-green-600 p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="h-8 w-8" />
              <h2 className="text-3xl font-bold">Piano Premium</h2>
            </div>
            <p className="text-xl opacity-90">
              Gestisci progetti illimitati, collabora con il tuo team e accedi a funzionalità esclusive
            </p>
          </div>

          {/* Vantaggi */}
          <div className="p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Cosa ottieni con Premium:
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Progetti illimitati</h4>
                  <p className="text-sm text-gray-600">Gestisci tutti i progetti che vuoi senza limiti</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Asset illimitati</h4>
                  <p className="text-sm text-gray-600">Traccia tutti gli asset aziendali</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Scadenze illimitate</h4>
                  <p className="text-sm text-gray-600">Non perdere mai una deadline importante</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Collaborazione team</h4>
                  <p className="text-sm text-gray-600">Aggiungi membri e gestisci ruoli</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Personalizzazione avanzata</h4>
                  <p className="text-sm text-gray-600">Value lists personalizzate e report</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Supporto prioritario</h4>
                  <p className="text-sm text-gray-600">Assistenza dedicata via email</p>
                </div>
              </div>
            </div>

            {/* Call to action */}
            <div className="bg-gradient-to-r from-primary-50 to-green-50 rounded-xl p-6 border-2 border-primary-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Mail className="h-12 w-12 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Richiedi l'upgrade
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Per passare al piano Premium, invia una email a:
                  </p>
                  <a
                    href="mailto:scadix@cesena.biz?subject=Richiesta upgrade a Premium - Scadix&body=Ciao,%0D%0A%0D%0ASono interessato a passare al piano Premium di Scadix.%0D%0A%0D%0AIl mio ID utente è: {user.id}%0D%0A%0D%0AAttendo vostre comunicazioni.%0D%0A%0D%0AGrazie"
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-lg"
                  >
                    <Mail className="h-5 w-5" />
                    scadix@cesena.biz
                  </a>
                  <p className="text-sm text-gray-600 mt-4">
                    Ti risponderemo entro 24 ore con i dettagli per completare l'upgrade
                  </p>
                </div>
              </div>
            </div>

            {/* Info account */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>Il tuo account:</strong> {user.email}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{user.id}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Hai domande? Contattaci a{' '}
            <a href="mailto:scadix@cesena.biz" className="text-primary-600 hover:text-primary-700 font-medium">
              scadix@cesena.biz
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
