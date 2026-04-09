'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { loadValueLists } from '@/lib/valueListsHelper'
import { checkLimit } from '@/lib/limitsHelper'

function NewDeadlineForm() {
  const searchParams = useSearchParams()
  const projectIdFromQuery = searchParams.get('project_id')
  const assetIdFromQuery = searchParams.get('asset_id')
  
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [frequency, setFrequency] = useState('')
  const [notes, setNotes] = useState('')
  const [projectId, setProjectId] = useState(projectIdFromQuery || '')
  const [assetId, setAssetId] = useState(assetIdFromQuery || '')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [categories, setCategories] = useState<any[]>([])
  const [frequencies, setFrequencies] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (projectId) {
      loadAssets(projectId)
    }
  }, [projectId])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const cats = await loadValueLists(supabase, 'deadline_category', user.id, true)
      setCategories(cats)

      const freqs = await loadValueLists(supabase, 'deadline_frequency', user.id, true)
      setFrequencies(freqs)

      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('name')

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

      if (assetIdFromQuery) {
        const { data: assetData } = await supabase
          .from('assets')
          .select('id, name, project_id')
          .eq('id', assetIdFromQuery)
          .single()

        if (assetData && assetData.project_id) {
          setProjectId(assetData.project_id)
          await loadAssets(assetData.project_id)
        }
      } else if (projectIdFromQuery) {
        await loadAssets(projectIdFromQuery)
      }
    } catch (error: any) {
      console.error('Errore caricamento dati:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const loadAssets = async (projId: string) => {
    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('project_id', projId)
      .order('name')

    setAssets(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')

      const limitCheck = await checkLimit(supabase, user.id, 'deadlines')
      
      if (!limitCheck.allowed) {
        setError(limitCheck.message || 'Limite scadenze raggiunto')
        setLoading(false)
        return
      }

      const { error: insertError } = await supabase
        .from('deadlines')
        .insert({
          title,
          category,
          due_date: dueDate,
          frequency: frequency || null,
          notes: notes || null,
          project_id: projectId || null,
          asset_id: assetId || null,
          user_id: user.id,
        })

      if (insertError) throw insertError

      router.push('/deadlines')
      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/deadlines"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alle scadenze
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Nuova Scadenza</h1>
        <p className="text-gray-600 mt-1">Crea una nuova scadenza</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titolo *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="es. Scadenza fiscale"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Seleziona categoria</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Scadenza *
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frequenza (opzionale)
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Nessuna</option>
            {frequencies.map((freq) => (
              <option key={freq.value} value={freq.value}>
                {freq.value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Progetto (opzionale)
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">Nessun progetto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {projectId && assets.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset (opzionale)
            </label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Nessun asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Note (opzionale)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Note aggiuntive..."
          />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="h-5 w-5" />
            {loading ? 'Creazione...' : 'Crea Scadenza'}
          </button>
          <Link
            href="/deadlines"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annulla
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function NewDeadlinePage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    }>
      <NewDeadlineForm />
    </Suspense>
  )
}
