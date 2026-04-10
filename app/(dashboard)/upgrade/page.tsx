'use client'

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

export default function UpgradePage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserEmail(user.email || null)
      setUserId(user.id || null)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('plan_id')
        .eq('user_id', user.id)
        .single()

      if (profile) setCurrentPlanId(profile.plan_id)

      const { data: allPlans } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .neq('name', 'admin')
        .order('display_order')

      setPlans(allPlans || [])
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatLimit = (limit: number | null) => {
    return limit === null ? 'Illimitati' : limit.toString()
  }

  if (loading) return <div className="p-12 text-center">Caricamento...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
      <div className="max-w-6xl mx-auto flex-1">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId
            const isFree = plan.price === 0 || plan.price === null

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
                  {!isFree && plan.price && (
                    <div className="mt-4">
                      <span className="text-3xl font-bold">€{(plan.price * 12).toFixed(2)}</span>
                      <span className={`text-sm ${isCurrentPlan ? 'text-primary-100' : 'text-gray-600'}`}>
                        /anno
                      </span>
                    </div>
                  )}
                  {isFree && (
                    <div className="mt-4 text-2xl font-bold">Gratuito</div>
                  )}
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
                    <div className="mt-6 text-center py-2 px-4 rounded-lg bg-primary-100 text-primary-700 font-semibold">
                      ✓ Piano Attuale
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Banner Footer */}
      <div className="mt-12 max-w-6xl mx-auto w-full bg-gradient-to-r from-primary-50 to-green-50 rounded-xl p-6 border-2 border-primary-200">
        <div className="flex items-center gap-4">
          <Mail className="h-8 w-8 text-primary-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-gray-700">
              Per cambiare piano, scrivi a <a href="mailto:scadix@cesena.biz" className="font-semibold text-primary-600 hover:text-primary-700">scadix@cesena.biz</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
