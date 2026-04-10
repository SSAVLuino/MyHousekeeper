'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Users, Edit2, Save, X, Search, Crown } from 'lucide-react'
import { isAdmin } from '@/lib/limitsHelper'

interface UserProfile {
  user_id: string
  email: string
  plan_id: string
  plan_name: string
  subscription_status: string
  custom_max_projects: number | null
  custom_max_assets: number | null
  custom_max_deadlines: number | null
  custom_can_edit_value_lists: boolean | null
  created_at: string
  projects_count: number
  assets_count: number
}

interface Plan {
  id: string
  name: string
  label: string
  max_projects: number | null
  max_assets: number | null
  max_deadlines: number | null
  can_edit_value_lists: boolean
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form state per editing
  const [editPlanId, setEditPlanId] = useState('')
  const [editCustomProjects, setEditCustomProjects] = useState<number | ''>('')
  const [editCustomAssets, setEditCustomAssets] = useState<number | ''>('')
  const [editCustomDeadlines, setEditCustomDeadlines] = useState<number | ''>('')
  const [editCustomValueLists, setEditCustomValueLists] = useState<boolean | null>(null)
  const [editStatus, setEditStatus] = useState('active')
  
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

    loadData()
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // Carica piani
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      setPlans(plansData || [])

      // Carica utenti con profili
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select(`
          *,
          subscription_plans (
            id,
            name,
            label
          )
        `)
        .order('created_at', { ascending: false })

      // Ottieni email da auth.users (tramite funzione RPC o API admin)
      // Per ora usiamo solo gli ID, in produzione dovresti avere una funzione RPC
      const enrichedUsers = await Promise.all(
        (profilesData || []).map(async (profile: any) => {
          // Conta risorse
          const [{ count: projectsCount }, { count: assetsCount }] = await Promise.all([
            supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', profile.user_id),
            supabase.from('assets').select('*', { count: 'exact', head: true }).eq('user_id', profile.user_id),
          ])

          return {
            ...profile,
            plan_name: profile.subscription_plans?.label || 'N/A',
            email: `user-${profile.user_id.substring(0, 8)}...`, // Placeholder
            projects_count: projectsCount || 0,
            assets_count: assetsCount || 0,
          }
        })
      )

      setUsers(enrichedUsers)
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: UserProfile) => {
    setEditingUserId(user.user_id)
    setEditPlanId(user.plan_id)
    setEditCustomProjects(user.custom_max_projects ?? '')
    setEditCustomAssets(user.custom_max_assets ?? '')
    setEditCustomDeadlines(user.custom_max_deadlines ?? '')
    setEditCustomValueLists(user.custom_can_edit_value_lists)
    setEditStatus(user.subscription_status)
  }

  const handleSave = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          plan_id: editPlanId,
          custom_max_projects: editCustomProjects === '' ? null : Number(editCustomProjects),
          custom_max_assets: editCustomAssets === '' ? null : Number(editCustomAssets),
          custom_max_deadlines: editCustomDeadlines === '' ? null : Number(editCustomDeadlines),
          custom_can_edit_value_lists: editCustomValueLists,
          subscription_status: editStatus,
        })
        .eq('user_id', userId)

      if (error) throw error

      setEditingUserId(null)
      loadData()
    } catch (error: any) {
      alert('Errore: ' + error.message)
    }
  }

  const handleCancel = () => {
    setEditingUserId(null)
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            Gestione Utenti
          </h1>
          <p className="page-subtitle">Gestisci piani e limiti degli utenti</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per email o ID utente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Totale Utenti</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Utenti Premium</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.plan_name.includes('Premium')).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Utenti Gratuiti</p>
          <p className="text-2xl font-bold text-gray-600">
            {users.filter(u => u.plan_name.includes('Gratuito')).length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Piano</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limiti Custom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilizzo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  {editingUserId === user.user_id ? (
                    // Edit Mode
                    <>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{user.email}</p>
                          <p className="text-xs text-gray-500 font-mono">{user.user_id.substring(0, 16)}...</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editPlanId}
                          onChange={(e) => setEditPlanId(e.target.value)}
                          className="text-sm px-2 py-1 border border-gray-300 rounded"
                        >
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <input
                            type="number"
                            value={editCustomProjects}
                            onChange={(e) => setEditCustomProjects(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Progetti"
                            className="w-20 text-xs px-2 py-1 border border-gray-300 rounded"
                          />
                          <input
                            type="number"
                            value={editCustomAssets}
                            onChange={(e) => setEditCustomAssets(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Asset"
                            className="w-20 text-xs px-2 py-1 border border-gray-300 rounded"
                          />
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={editCustomValueLists || false}
                              onChange={(e) => setEditCustomValueLists(e.target.checked)}
                            />
                            Value Lists
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{user.projects_count} progetti</p>
                        <p className="text-xs text-gray-600">{user.assets_count} asset</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded"
                        >
                          <option value="active">Attivo</option>
                          <option value="canceled">Cancellato</option>
                          <option value="expired">Scaduto</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(user.user_id)}
                            className="text-green-600 hover:text-green-700 p-1"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-gray-600 hover:text-gray-700 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td> 
                    </>
                  ) : (
                    // View Mode
                    <>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{user.user_id}</p>                      
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{user.plan_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {user.custom_max_projects && <p>Progetti: {user.custom_max_projects}</p>}
                          {user.custom_max_assets && <p>Asset: {user.custom_max_assets}</p>}
                          {user.custom_can_edit_value_lists && <p>✓ Value Lists</p>}
                          {!user.custom_max_projects && !user.custom_max_assets && !user.custom_can_edit_value_lists && (
                            <p className="text-gray-400">Nessuno</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{user.projects_count} progetti</p>
                        <p className="text-xs text-gray-600">{user.assets_count} asset</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          user.subscription_status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.subscription_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-primary-600 hover:text-primary-700 p-1"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
