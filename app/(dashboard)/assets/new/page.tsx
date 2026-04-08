'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { loadValueLists } from '@/lib/valueListsHelper'

function NewAssetForm() {
  const searchParams = useSearchParams()
  const projectIdFromQuery = searchParams.get('project_id')
  
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [projectId, setProjectId] = useState(projectIdFromQuery || '')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [assetTypes, setAssetTypes] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Carica tipi asset dalla value_lists (default + personali)
      const types = await loadValueLists(supabase, 'asset_type', user.id, true)
      setAssetTypes(types)

      // Carica progetti dell'utente
      const { data: userProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('name')

      setProjects(userProjects || [])
    } catch (error: any) {
      console.error('Errore caricamento dati:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')

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
        .insert({
          name,
          type,
          project_id: projectId || null,
          user_id: user.id,
          details: parsedDetails,
        })

      if (error) throw error

      router.push('/assets')
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
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/assets"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna agli asset
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Nuovo Asset</h1>
        <p className="text-gray-600 mt-1">Crea un nuovo asset</p>
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
              placeholder="es. Appartamento Via Roma 10"
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
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
              placeholder='{"indirizzo": "Via Roma 10", "mq": 80} oppure testo libero'
            />
            <p className="text-xs text-gray-500 mt-1">Inserisci JSON valido o testo libero</p>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Salvataggio...' : 'Salva Asset'}
            </button>
            <Link
              href="/assets"
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

export default function NewAssetPage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    }>
      <NewAssetForm />
    </Suspense>
  )
}
