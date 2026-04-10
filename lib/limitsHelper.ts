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
  try {
    console.log('getUserLimits - userId:', userId)
    
    const { data: profile, error } = await supabase
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

    console.log('getUserLimits - profile:', profile)
    console.log('getUserLimits - error:', error)

    if (error) {
      console.error('getUserLimits - Supabase error:', error)
      return null
    }

    if (!profile) {
      console.log('getUserLimits - No profile found')
      return null
    }

    if (!profile.subscription_plans) {
      console.log('getUserLimits - No subscription_plans in profile')
      return null
    }

    const plan = profile.subscription_plans

    const result = {
      maxProjects: profile.custom_max_projects ?? plan.max_projects,
      maxAssets: profile.custom_max_assets ?? plan.max_assets,
      maxDeadlines: profile.custom_max_deadlines ?? plan.max_deadlines,
      canEditValueLists: profile.custom_can_edit_value_lists ?? plan.can_edit_value_lists,
      canAccessAdmin: plan.can_access_admin,
      planName: plan.label,
      planId: plan.id,
    }

    console.log('getUserLimits - result:', result)
    return result
  } catch (error) {
    console.error('getUserLimits - catch error:', error)
    return null
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
  try {
    const limits = await getUserLimits(supabase, userId)
    
    if (!limits) {
      // Se non ci sono limiti (tabelle non esistono), consenti tutto
      return {
        allowed: true,
        current: 0,
        max: null,
        message: 'Sistema limiti non configurato'
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
  } catch (error) {
    console.error('checkLimit error:', error)
    // In caso di errore, consenti la creazione
    return {
      allowed: true,
      current: 0,
      max: null,
      message: 'Controllo limiti non disponibile'
    }
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
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        subscription_plans (
          can_edit_value_lists
        )
      `)
      .eq('user_id', userId)
      .eq('subscription_status', 'active')
      .single()

    if (error || !profile?.subscription_plans) {
      return false
    }

    return profile.subscription_plans.can_edit_value_lists || false
  } catch (error) {
    console.error('canEditValueLists error:', error)
    return false
  }
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
