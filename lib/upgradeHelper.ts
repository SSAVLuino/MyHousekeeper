import { SupabaseClient } from '@supabase/supabase-js'

export interface SubscriptionPlan {
  id: string
  name: string
  label: string
  description: string | null
  price: number | null
  max_projects: number | null
  max_assets: number | null
  max_deadlines: number | null
  can_edit_value_lists: boolean
  can_access_admin: boolean
  features: Record<string, any> | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface UpgradeSuggestion {
  currentPlan: SubscriptionPlan
  availableUpgrades: SubscriptionPlan[]
  nextRecommendedPlan: SubscriptionPlan | null
  shouldUpgrade: {
    valueListAccess: boolean
    adminAccess: boolean
    projects: boolean
    assets: boolean
    deadlines: boolean
  }
}

export interface CurrentUsage {
  valueListsCount: number
  projectsCount: number
  assetsCount: number
  deadlinesCount: number
}

/**
 * Ottiene tutti i piani di abbonamento ordinati per display_order
 */
export async function getAllPlans(
  supabase: SupabaseClient
): Promise<SubscriptionPlan[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('getAllPlans error:', error)
    return []
  }
}

/**
 * Ottiene i piani disponibili per l'upgrade rispetto al piano attuale
 */
export async function getAvailableUpgrades(
  supabase: SupabaseClient,
  currentPlanId: string
): Promise<SubscriptionPlan[]> {
  try {
    const allPlans = await getAllPlans(supabase)
    
    // Trova l'ordine del piano attuale
    const currentPlan = allPlans.find(p => p.id === currentPlanId)
    if (!currentPlan) return []

    // Restituisci i piani con display_order > del piano attuale
    return allPlans.filter(p => p.display_order > currentPlan.display_order)
  } catch (error) {
    console.error('getAvailableUpgrades error:', error)
    return []
  }
}

/**
 * Conta quante value lists l'utente ha creato (personalizzate)
 */
export async function countUserValueLists(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('value_lists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('countUserValueLists error:', error)
    return 0
  }
}

/**
 * Ottiene l'utilizzo attuale dell'utente
 */
export async function getCurrentUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<CurrentUsage> {
  try {
    const [
      { count: valueListsCount },
      { count: projectsCount },
      { count: assetsCount },
      { count: deadlinesCount }
    ] = await Promise.all([
      supabase
        .from('value_lists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId),
      supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('deadlines')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    ])

    return {
      valueListsCount: valueListsCount || 0,
      projectsCount: projectsCount || 0,
      assetsCount: assetsCount || 0,
      deadlinesCount: deadlinesCount || 0
    }
  } catch (error) {
    console.error('getCurrentUsage error:', error)
    return {
      valueListsCount: 0,
      projectsCount: 0,
      assetsCount: 0,
      deadlinesCount: 0
    }
  }
}

/**
 * Calcola se l'utente dovrebbe fare upgrade per una specifica feature
 */
export function calculateUpgradeNeeds(
  currentPlan: SubscriptionPlan,
  usage: CurrentUsage
): UpgradeSuggestion['shouldUpgrade'] {
  return {
    valueListAccess: !currentPlan.can_edit_value_lists,
    adminAccess: !currentPlan.can_access_admin,
    projects: currentPlan.max_projects !== null && usage.projectsCount >= currentPlan.max_projects,
    assets: currentPlan.max_assets !== null && usage.assetsCount >= currentPlan.max_assets,
    deadlines: currentPlan.max_deadlines !== null && usage.deadlinesCount >= currentPlan.max_deadlines
  }
}

/**
 * Suggerisce il prossimo piano di upgrade basato sulle necessità
 */
export function getRecommendedUpgradePlan(
  availableUpgrades: SubscriptionPlan[],
  shouldUpgrade: UpgradeSuggestion['shouldUpgrade']
): SubscriptionPlan | null {
  if (availableUpgrades.length === 0) return null

  // Ordina gli upgrade disponibili per display_order crescente (primo upgrade è quello più vicino)
  const sortedUpgrades = [...availableUpgrades].sort(
    (a, b) => a.display_order - b.display_order
  )

  // Trova il primo piano che soddisfa almeno una delle necessità
  for (const plan of sortedUpgrades) {
    if (
      (shouldUpgrade.valueListAccess && plan.can_edit_value_lists) ||
      (shouldUpgrade.adminAccess && plan.can_access_admin) ||
      (shouldUpgrade.projects && plan.max_projects === null) ||
      (shouldUpgrade.assets && plan.max_assets === null) ||
      (shouldUpgrade.deadlines && plan.max_deadlines === null)
    ) {
      return plan
    }
  }

  // Se nessun upgrade soddisfa le necessità, ritorna il primo disponibile
  return sortedUpgrades[0] || null
}

/**
 * Ottiene le informazioni complete per suggerire upgrade
 */
export async function getUpgradeSuggestions(
  supabase: SupabaseClient,
  userId: string,
  currentPlanId: string
): Promise<UpgradeSuggestion | null> {
  try {
    const allPlans = await getAllPlans(supabase)
    const currentPlan = allPlans.find(p => p.id === currentPlanId)
    
    if (!currentPlan) return null

    const availableUpgrades = await getAvailableUpgrades(supabase, currentPlanId)
    const usage = await getCurrentUsage(supabase, userId)
    const shouldUpgrade = calculateUpgradeNeeds(currentPlan, usage)
    const nextRecommendedPlan = getRecommendedUpgradePlan(availableUpgrades, shouldUpgrade)

    return {
      currentPlan,
      availableUpgrades,
      nextRecommendedPlan,
      shouldUpgrade
    }
  } catch (error) {
    console.error('getUpgradeSuggestions error:', error)
    return null
  }
}

/**
 * Formatta il nome della feature per display
 */
export function formatFeatureName(feature: keyof UpgradeSuggestion['shouldUpgrade']): string {
  const names: Record<string, string> = {
    valueListAccess: 'Modifica Value Lists',
    adminAccess: 'Accesso Admin',
    projects: 'Limite Progetti',
    assets: 'Limite Asset',
    deadlines: 'Limite Scadenze'
  }
  return names[feature] || feature
}
