'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { loadValueLists } from '@/lib/valueListsHelper'
import { getProjectPermissions } from '@/lib/permissionsHelper'

export default function EditAssetPage() {
  const params = useParams()
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [projectId, setProjectId] = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  
  const [assetTypes, setAssetTypes] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Carica asset corrente con info progetto
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('*, projects(id, owner_id)')
        .eq('id', params.id)
        .single()

      if (assetError || !asset) {
        setError('Asset non trovato')
        setLoading(false)
        return
      }

      // Verifica permessi
      const permissions = await getProjectPermissions(supabase, asset.project_id, user.id)
      
      if (!permissions.canEditAssets) {
        setError('Non hai i permessi per modificare questo asset')
        setCanEdit(false)
        setLoading(false)
        return
      }

      setCanEdit(true)

      setName(asset.name)
      setType(asset.type)
      setProjectId(asset.project_id || '')
      setDetails(asset.details ? (typeof asset.details === 'object' ? JSON.stringify(asset.details, null, 2) : asset.details) : '')

      // Carica tipi asset (default + personali)
      const types = await loadValueLists(supabase, 'asset_type', user.id, true)
      setAssetTypes(types)

      // Carica progetti owned
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('name')

      // Carica progetti member (solo admin/editor possono modificare asset)
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'editor'])

      const memberProjectIds = memberships?.map(m => m.project_id) || []
      
      let memberProjects: any[] = []
      if (memberProjectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', memberProjectIds)
          .order('name')
        
        memberProjects = data || []
      }

      const allProjects = [...(ownedProjects || []), ...memberProjects]
      setProjects(allProjects)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canEdit) {
      setError('Non hai i permessi per modificare questo asset')
      return
    }
    
    setSaving(true)
    setError(null)

    try {
      let parsedDetails = null
      if (details.trim()) {
        try {
          parsedDetails = JSON.parse(details)
        } catch {
          parsedDetails = { note: details }
        }
      }

      const { error } = await supabase
        .from('assets')
        .update({
          name,
          type,
          project_id: projectId || null,
          details: parsedDetails,
        })
        .eq('id', params.id)

      if (error) throw error

      router.push(`/assets/${params.id}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Accesso Negato</h2>
          <p className="text-red-700 mb-4">{error || 'Non hai i permessi per modificare questo asset'}</p>
          <Link
            href="/assets"
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna agli asset
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/assets/${params.id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna all'asset
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Modifica Asset</h1>
        <p className="text-gray-600 mt-1">Aggiorna le informazioni dell'asset</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome Asset *
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo *
            </label>
            <select
              id="type"
              required
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Seleziona un tipo</option>
              {assetTypes.map((assetType) => (
                <option key={assetType.id} value={assetType.value}>
                  {assetType.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-2">
              Progetto *
            </label>
            <select
              id="projectId"
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Seleziona un progetto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-2">
              Dettagli (JSON o testo)
            </label>
            <textarea
              id="details"
              rows={6}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
              placeholder='{"indirizzo": "Via Roma 10", "mq": 80}'
            />
            <p className="text-xs text-gray-500 mt-1">Inserisci JSON valido o testo libero</p>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
            <Link
              href={`/assets/${params.id}`}
              className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
