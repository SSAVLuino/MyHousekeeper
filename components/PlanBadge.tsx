'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserLimits, formatLimits, getPlanBadgeColor, UserLimits } from '@/lib/limitsHelper'
import { Crown, Zap, Shield } from 'lucide-react'
import Link from 'next/link'

export default function PlanBadge() {
  const [limits, setLimits] = useState<UserLimits | null>(null)
  const [usage, setUsage] = useState({ projects: 0, assets: 0, deadlines: 0 })
  const [loading, setLoading] = useState(true)
  
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
      const [{ count: projectCount }, { count: assetCount }, { count: deadlineCount }] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('deadlines').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      setUsage({
        projects: projectCount || 0,
        assets: assetCount || 0,
        deadlines: deadlineCount || 0,
      })
    } catch (error) {
      console.error('Errore caricamento limiti:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !limits) {
    return (
      <div className="p-3 bg-gray-100 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-32"></div>
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

  return (
    <div className={`p-3 rounded-lg border ${getPlanBadgeColor(limits.planName)}`}>
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

          <Link
            href="/upgrade"
            className="block mt-2 text-center text-xs bg-white bg-opacity-50 hover:bg-opacity-100 transition-colors py-1.5 rounded font-medium"
          >
            Passa a Premium →
          </Link>
        </div>
      )}

      {isPremium && (
        <p className="text-xs text-gray-600">
          ✨ Accesso illimitato
        </p>
      )}
    </div>
  )
}
