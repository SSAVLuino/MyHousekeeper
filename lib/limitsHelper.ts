import { SupabaseClient } from '@supabase/supabase-js'

export interface UserLimits {
  maxProjects: number | null
  maxAssets: number | null
  maxDeadlines: number | null
  canEditValueLists: boolean
  canAccessAdmin: boolean
  planName: string
  planId: string
}

export interface LimitCheckResult {
  allowed: boolean
  current: number
  max: number | null
  message?: string
  planName?: string
}

/**
 * Ottiene i limiti effettivi dell'utente (piano + override personalizzati)
 */
export async function getUserLimits(
  supabase: SupabaseClient,
  userId: string
): Promise<UserLimits | null> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select(`
      *,
      subscription_plans (
        id,
        name,
        label,
        max_projects,
        max_assets,
        max_deadlines,
        can_edit_value_lists,
        can_access_admin
      )
    `)
    .eq('user_id', userId)
    .eq('subscription_status', 'active')
    .single()

  if (!profile || !profile.subscription_plans) return null

  const plan = profile.subscription_plans

  return {
    maxProjects: profile.custom_max_projects ?? plan.max_projects,
    maxAssets: profile.custom_max_assets ?? plan.max_assets,
    maxDeadlines: profile.custom_max_deadlines ?? plan.max_deadlines,
    canEditValueLists: profile.custom_can_edit_value_lists ?? plan.can_edit_value_lists,
    canAccessAdmin: plan.can_access_admin,
    planName: plan.label,
    planId: plan.id,
  }
}

/**
 * Controlla se l'utente può creare una nuova risorsa
 */
export async function checkLimit(
  supabase: SupabaseClient,
  userId: string,
  type: 'projects' | 'assets' | 'deadlines'
): Promise<LimitCheckResult> {
  const limits = await getUserLimits(supabase, userId)
  
  if (!limits) {
    return {
      allowed: false,
      current: 0,
      max: 0,
      message: 'Profilo utente non trovato'
    }
  }

  // Determina il limite massimo
  const maxLimit = type === 'projects' ? limits.maxProjects
                 : type === 'assets' ? limits.maxAssets
                 : limits.maxDeadlines

  // NULL = illimitato
  if (maxLimit === null) {
    return {
      allowed: true,
      current: 0,
      max: null,
      planName: limits.planName
    }
  }

  // Conta risorse attuali dell'utente
  const tableName = type
  const userField = type === 'projects' ? 'owner_id' : 'user_id'

  const { count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .eq(userField, userId)

  const current = count || 0
  const allowed = current < maxLimit

  return {
    allowed,
    current,
    max: maxLimit,
    planName: limits.planName,
    message: allowed ? undefined : 
      `Limite raggiunto: ${current}/${maxLimit} ${type}. 
       Passa a un piano superiore per aumentare i limiti.`
  }
}

/**
 * Verifica se l'utente è admin
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const limits = await getUserLimits(supabase, userId)
  return limits?.canAccessAdmin || false
}

/**
 * Verifica se l'utente può modificare le value lists
 */
export async function canEditValueLists(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const limits = await getUserLimits(supabase, userId)
  return limits?.canEditValueLists || false
}

/**
 * Formatta i limiti per display UI
 */
export function formatLimits(limits: UserLimits): string {
  const parts: string[] = []
  
  if (limits.maxProjects !== null) {
    parts.push(`${limits.maxProjects} ${limits.maxProjects === 1 ? 'progetto' : 'progetti'}`)
  } else {
    parts.push('Progetti illimitati')
  }
  
  if (limits.maxAssets !== null) {
    parts.push(`${limits.maxAssets} asset`)
  } else {
    parts.push('Asset illimitati')
  }
  
  return parts.join(' • ')
}

/**
 * Ottiene il badge colore per il piano
 */
export function getPlanBadgeColor(planName: string): string {
  const lowerName = planName.toLowerCase()
  
  if (lowerName.includes('admin')) return 'bg-purple-100 text-purple-700 border-purple-300'
  if (lowerName.includes('enterprise')) return 'bg-blue-100 text-blue-700 border-blue-300'
  if (lowerName.includes('premium')) return 'bg-green-100 text-green-700 border-green-300'
  return 'bg-gray-100 text-gray-700 border-gray-300'
}
