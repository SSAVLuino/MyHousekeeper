'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserLimits, formatLimits, getPlanBadgeColor, UserLimits } from '@/lib/limitsHelper'
import { getUpgradeSuggestions, UpgradeSuggestion, formatFeatureName } from '@/lib/upgradeHelper'
import { Crown, Zap, Shield, ChevronRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function PlanBadge() {
  const [limits, setLimits] = useState<UserLimits | null>(null)
  const [usage, setUsage] = useState({ projects: 0, assets: 0, deadlines: 0, valueLists: 0 })
  const [upgradeSuggestion, setUpgradeSuggestion] = useState<UpgradeSuggestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedUpgrades, setExpandedUpgrades] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadLimitsAndUsage()
  }, [])

  const loadLimitsAndUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Carica limiti
      const userLimits = await getUserLimits(supabase, user.id)
      setLimits(userLimits)

      // Carica utilizzo attuale
      const [
        { count: projectCount },
        { count: assetCount },
        { count: deadlineCount },
        { count: valueListCount }
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('deadlines').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('value_lists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      setUsage({
        projects: projectCount || 0,
        assets: assetCount || 0,
        deadlines: deadlineCount || 0,
        valueLists: valueListCount || 0,
      })

      // Carica suggerimenti upgrade
      if (userLimits) {
        const suggestions = await getUpgradeSuggestions(supabase, user.id, userLimits.planId)
        setUpgradeSuggestion(suggestions)
      }
    } catch (error) {
      console.error('Errore caricamento limiti:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-3 bg-gray-100 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-32"></div>
      </div>
    )
  }

  if (!limits) {
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800 font-medium mb-1">⚠️ Sistema profili non configurato</p>
        <p className="text-xs text-yellow-700">
          Esegui la migration SQL per attivare i limiti
        </p>
      </div>
    )
  }

  const getPlanIcon = () => {
    if (limits.canAccessAdmin) return <Shield className="h-4 w-4" />
    if (limits.maxProjects === null) return <Crown className="h-4 w-4" />
    return <Zap className="h-4 w-4" />
  }

  const isNearLimit = (current: number, max: number | null) => {
    if (max === null) return false
    return current >= max * 0.8
  }

  const isPremium = limits.maxProjects === null
  const hasAnyUpgradeNeed = upgradeSuggestion && Object.values(upgradeSuggestion.shouldUpgrade).some(v => v)

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${getPlanBadgeColor(limits.planName)}`}>
      {/* Main Badge */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {getPlanIcon()}
          <span className="font-semibold text-sm">{limits.planName}</span>
        </div>

        {!isPremium && (
          <div className="space-y-1 text-xs">
            {/* Progetti */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Progetti</span>
              <span className={`font-medium ${
                isNearLimit(usage.projects, limits.maxProjects) ? 'text-orange-600' : ''
              }`}>
                {usage.projects}/{limits.maxProjects || '∞'}
              </span>
            </div>

            {/* Asset */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Asset</span>
              <span className={`font-medium ${
                isNearLimit(usage.assets, limits.maxAssets) ? 'text-orange-600' : ''
              }`}>
                {usage.assets}/{limits.maxAssets || '∞'}
              </span>
            </div>

            {/* Scadenze */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Scadenze</span>
              <span className={`font-medium ${
                isNearLimit(usage.deadlines, limits.maxDeadlines) ? 'text-orange-600' : ''
              }`}>
                {usage.deadlines}/{limits.maxDeadlines || '∞'}
              </span>
            </div>

            {/* Value Lists - solo se non ha accesso */}
            {!limits.canEditValueLists && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Value Lists</span>
                <span className="text-red-600 font-medium">Bloccato</span>
              </div>
            )}

            {/* Admin Access - solo se non ha accesso */}
            {!limits.canAccessAdmin && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Admin</span>
                <span className="text-red-600 font-medium">Bloccato</span>
              </div>
            )}
          </div>
        )}

        {isPremium && (
          <p className="text-xs text-gray-600">
            ✨ Accesso illimitato
          </p>
        )}
      </div>

      {/* Upgrade Suggestions - if available */}
      {!isPremium && upgradeSuggestion && upgradeSuggestion.availableUpgrades.length > 0 && (
        <div className={`border-t px-3 py-2 bg-opacity-30 ${
          hasAnyUpgradeNeed ? 'bg-orange-100 border-orange-200' : 'bg-blue-100 border-blue-200'
        }`}>
          {/* Toggle Button */}
          <button
            onClick={() => setExpandedUpgrades(!expandedUpgrades)}
            className="w-full flex items-center justify-between gap-2 text-left hover:opacity-75 transition-opacity"
          >
            <div className="flex items-center gap-2">
              {hasAnyUpgradeNeed && <AlertCircle className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />}
              <span className={`text-xs font-medium ${
                hasAnyUpgradeNeed ? 'text-orange-700' : 'text-blue-700'
              }`}>
                {hasAnyUpgradeNeed ? 'Upgrade consigliato' : 'Upgrade disponibili'}
              </span>
            </div>
            <ChevronRight className={`h-3.5 w-3.5 transition-transform flex-shrink-0 ${
              expandedUpgrades ? 'rotate-90' : ''
            }`} />
          </button>

          {/* Expanded Content */}
          {expandedUpgrades && (
            <div className="mt-2 space-y-2 pt-2 border-t border-current border-opacity-20">
              {/* Features Needed */}
              {hasAnyUpgradeNeed && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-700">Feature necessarie:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(upgradeSuggestion.shouldUpgrade).map(([key, needed]) => 
                      needed && (
                        <span 
                          key={key}
                          className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded"
                        >
                          {formatFeatureName(key as any)}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Recommended Plan */}
              {upgradeSuggestion.nextRecommendedPlan && (
                <div className="space-y-1 pt-2">
                  <p className="text-xs font-semibold text-gray-700">Piano consigliato:</p>
                  <Link
                    href="/upgrade"
                    className="block text-xs bg-white bg-opacity-60 hover:bg-opacity-100 transition-colors px-3 py-2 rounded font-medium border border-current border-opacity-30"
                  >
                    <div className="flex items-center justify-between">
                      <span>{upgradeSuggestion.nextRecommendedPlan.label}</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                    {upgradeSuggestion.nextRecommendedPlan.description && (
                      <p className="text-xs opacity-75 mt-1">{upgradeSuggestion.nextRecommendedPlan.description}</p>
                    )}
                  </Link>
                </div>
              )}

              {/* All Available Plans */}
              {upgradeSuggestion.availableUpgrades.length > 1 && (
                <div className="space-y-1 pt-2">
                  <p className="text-xs font-semibold text-gray-700">Tutti gli upgrade:</p>
                  <div className="flex flex-col gap-1">
                    {upgradeSuggestion.availableUpgrades.map((plan) => (
                      <Link
                        key={plan.id}
                        href="/upgrade"
                        className="text-xs bg-white bg-opacity-40 hover:bg-opacity-70 transition-colors px-2 py-1 rounded text-gray-700"
                      >
                        {plan.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fallback CTA */}
      {!isPremium && (!upgradeSuggestion || upgradeSuggestion.availableUpgrades.length === 0) && (
        <Link
          href="/upgrade"
          className="block text-center text-xs bg-white bg-opacity-50 hover:bg-opacity-100 transition-colors py-2 px-3 border-t text-gray-700 font-medium"
        >
          Passa a Premium →
        </Link>
      )}
    </div>
  )
}
