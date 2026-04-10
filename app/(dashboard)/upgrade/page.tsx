import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Check, Mail } from 'lucide-react'
import Link from 'next/link'

interface Plan {
  id: string
  label: string
  description: string | null
  price: number | null
  max_projects: number | null
  max_assets: number | null
  max_deadlines: number | null
  can_edit_value_lists: boolean
  display_order: number
}

async function loadData(user: any) {
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan_id')
    .eq('user_id', user.id)
    .single()

  const { data: allPlans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .not('name', 'eq', 'admin')
    .order('display_order')

  return {
    currentPlanId: profile?.plan_id || null,
    plans: allPlans || [],
    userEmail: user.email,
    userId: user.id
  }
}

export default async function UpgradePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { currentPlanId, plans, userEmail, userId } = await loadData(user)

  const formatLimit = (limit: number | null) => {
    return limit === null ? 'Illimitati' : limit.toString()
  }

  const formatPrice = (price: number | null) => {
    if (price === 0 || price === null) return 'Gratuito'
    return `€${(price * 12).toFixed(2)}/anno`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alla dashboard
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-2">Scegli il tuo piano</h1>
        <p className="text-xl text-gray-600 mb-12">
          Seleziona il piano che meglio si adatta alle tue esigenze
        </p>

        {/* Grid Piani */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId

            return (
              <div
                key={plan.id}
                className={`rounded-xl border-2 overflow-hidden transition-all ${
                  isCurrentPlan
                    ? 'border-primary-600 bg-primary-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Header */}
                <div className={`p-6 ${isCurrentPlan ? 'bg-primary-600 text-white' : 'bg-gray-50'}`}>
                  <h2 className="text-2xl font-bold mb-2">{plan.label}</h2>
                  {plan.description && (
                    <p className={`text-sm ${isCurrentPlan ? 'text-primary-100' : 'text-gray-600'}`}>
                      {plan.description}
                    </p>
                  )}
                  <div className="mt-4 text-3xl font-bold">
                    {formatPrice(plan.price)}
                  </div>
                </div>

                {/* Features */}
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Cosa incluye:</h3>
                  
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Progetti:</strong> {formatLimit(plan.max_projects)}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Asset:</strong> {formatLimit(plan.max_assets)}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Scadenze:</strong> {formatLimit(plan.max_deadlines)}
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check
                        className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          plan.can_edit_value_lists ? 'text-green-600' : 'text-gray-300'
                        }`}
                      />
                      <span className={plan.can_edit_value_lists ? '' : 'text-gray-400'}>
                        <strong>Value Lists:</strong> {plan.can_edit_value_lists ? 'Sì' : 'No'}
                      </span>
                    </li>
                  </ul>

                  {isCurrentPlan && (
                    <div className="mt-6 text-center py-2 px-4 rounded-lg bg-primary-600 text-white font-semibold">
                      ✓ Piano Attuale
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Banner Email */}
        <div className="bg-gradient-to-r from-primary-50 to-green-50 rounded-xl p-8 border-2 border-primary-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Mail className="h-12 w-12 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Richiedi l'upgrade
              </h3>
              <p className="text-gray-700 mb-4">
                Per passare a un piano superiore, invia una email a:
              </p>
              
                href={`mailto:scadix@cesena.biz?subject=Richiesta upgrade - Scadix&body=Ciao,%0D%0A%0D%0ASono interessato a passare a un piano superiore di Scadix.%0D%0A%0D%0AAccount: ${userEmail}%0D%0AID: ${userId}%0D%0A%0D%0AAttendo vostre comunicazioni.%0D%0A%0D%0AGrazie`}
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
      </div>
    </div>
  )
}
