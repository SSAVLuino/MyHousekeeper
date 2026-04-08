'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Settings, Edit2, Save, X, Plus, Trash2 } from 'lucide-react'
import { isAdmin } from '@/lib/limitsHelper'

interface Plan {
  id: string
  name: string
  label: string
  description: string | null
  price: number
  max_projects: number | null
  max_assets: number | null
  max_deadlines: number | null
  can_edit_value_lists: boolean
  can_access_admin: boolean
  is_active: boolean
  display_order: number
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  
  // Form state
  const [formLabel, setFormLabel] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState<number>(0)
  const [formMaxProjects, setFormMaxProjects] = useState<number | ''>('')
  const [formMaxAssets, setFormMaxAssets] = useState<number | ''>('')
  const [formMaxDeadlines, setFormMaxDeadlines] = useState<number | ''>('')
  const [formCanEditValueLists, setFormCanEditValueLists] = useState(false)
  const [formDisplayOrder, setFormDisplayOrder] = useState(0)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const isAdminUser = await isAdmin(supabase, user.id)
    if (!isAdminUser) {
      router.push('/dashboard')
      return
    }

    loadPlans()
  }

  const loadPlans = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order')

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (plan: Plan) => {
    setEditingId(plan.id)
    setFormLabel(plan.label)
    setFormDescription(plan.description || '')
    setFormPrice(plan.price)
    setFormMaxProjects(plan.max_projects ?? '')
    setFormMaxAssets(plan.max_assets ?? '')
    setFormMaxDeadlines(plan.max_deadlines ?? '')
    setFormCanEditValueLists(plan.can_edit_value_lists)
    setFormDisplayOrder(plan.display_order)
  }

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          label: formLabel,
          description: formDescription || null,
          price: formPrice,
          max_projects: formMaxProjects === '' ? null : Number(formMaxProjects),
          max_assets: formMaxAssets === '' ? null : Number(formMaxAssets),
          max_deadlines: formMaxDeadlines === '' ? null : Number(formMaxDeadlines),
          can_edit_value_lists: formCanEditValueLists,
          display_order: formDisplayOrder,
        })
        .eq('id', id)

      if (error) throw error

      setEditingId(null)
      loadPlans()
    } catch (error: any) {
      alert('Errore: ' + error.message)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      loadPlans()
    } catch (error: any) {
      alert('Errore: ' + error.message)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsAdding(false)
    resetForm()
  }

  const resetForm = () => {
    setFormLabel('')
    setFormDescription('')
    setFormPrice(0)
    setFormMaxProjects('')
    setFormMaxAssets('')
    setFormMaxDeadlines('')
    setFormCanEditValueLists(false)
    setFormDisplayOrder(0)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            Gestione Piani
          </h1>
          <p className="page-subtitle">Configura i piani di sottoscrizione</p>
        </div>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-lg shadow-sm border-2 ${
              plan.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
            } overflow-hidden`}
          >
            {editingId === plan.id ? (
              // Edit Mode
              <div className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Piano
                    </label>
                    <input
                      type="text"
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prezzo (€/mese)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrizione
                    </label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Progetti <span className="text-xs text-gray-500">(vuoto = ∞)</span>
                    </label>
                    <input
                      type="number"
                      value={formMaxProjects}
                      onChange={(e) => setFormMaxProjects(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Illimitati"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Asset <span className="text-xs text-gray-500">(vuoto = ∞)</span>
                    </label>
                    <input
                      type="number"
                      value={formMaxAssets}
                      onChange={(e) => setFormMaxAssets(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Illimitati"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Scadenze <span className="text-xs text-gray-500">(vuoto = ∞)</span>
                    </label>
                    <input
                      type="number"
                      value={formMaxDeadlines}
                      onChange={(e) => setFormMaxDeadlines(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Illimitate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formCanEditValueLists}
                      onChange={(e) => setFormCanEditValueLists(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Può modificare Value Lists</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ordine
                    </label>
                    <input
                      type="number"
                      value={formDisplayOrder}
                      onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => handleSave(plan.id)}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Save className="h-4 w-4" />
                    Salva
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{plan.label}</h3>
                      <span className="text-2xl font-bold text-primary-600">
                        €{plan.price.toFixed(2)}
                        <span className="text-sm text-gray-500">/mese</span>
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {plan.max_projects ?? '∞'} Progetti
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                        {plan.max_assets ?? '∞'} Asset
                      </span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                        {plan.max_deadlines ?? '∞'} Scadenze
                      </span>
                      {plan.can_edit_value_lists && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          ✓ Value Lists
                        </span>
                      )}
                      {plan.can_access_admin && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                          ✓ Admin
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(plan.id, plan.is_active)}
                      className={`text-xs px-3 py-1 rounded ${
                        plan.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {plan.is_active ? 'Attivo' : 'Disattivo'}
                    </button>
                    <button
                      onClick={() => handleEdit(plan)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Piano: <code className="font-mono">{plan.name}</code> • 
                  Ordine: {plan.display_order}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
