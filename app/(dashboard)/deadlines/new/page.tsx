'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function NewDeadlinePage() {
  const searchParams = useSearchParams()
  const projectIdFromQuery = searchParams.get('project_id')
  
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [frequency, setFrequency] = useState('')
  const [notes, setNotes] = useState('')
  const [projectId, setProjectId] = useState(projectIdFromQuery || '')
  const [assetId, setAssetId] = useState('')
  
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

      // Carica categorie dalla value_lists
      const { data: cats } = await supabase
        .from('value_lists')
        .select('*')
        .eq('category', 'deadline_category')
        .eq('is_active', true)
        .order('order_index')

      setCategories(cats || [])

      // Carica frequenze dalla value_lists
      const { data: freqs } = await supabase
        .from('value_lists')
        .select('*')
        .eq('category', 'deadline_frequency')
        .eq('is_active', true)
        .order('order_index')

      setFrequencies(freqs || [])

      // Carica progetti dell'utente
      const { data: userProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('name')

      setProjects(userProjects || [])

      // Se c'è un projectId, carica gli asset
      if (projectIdFromQuery) {
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

      const { error } = await supabase
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

      if (error) throw error

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
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Titolo *
            </label>
            <input
              type="text"
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="es. Pagamento IMU"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                id="category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Seleziona categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                Data Scadenza *
              </label>
              <input
                type="date"
                id="dueDate"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
              Frequenza
            </label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Nessuna ricorrenza</option>
              {frequencies.map((freq) => (
                <option key={freq.id} value={freq.value}>
                  {freq.label}
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
              onChange={(e) => {
                setProjectId(e.target.value)
                setAssetId('') // Reset asset quando cambia progetto
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Seleziona progetto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {projectId && assets.length > 0 && (
            <div>
              <label htmlFor="assetId" className="block text-sm font-medium text-gray-700 mb-2">
                Asset (opzionale)
              </label>
              <select
                id="assetId"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Nessun asset specifico</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Note
            </label>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Aggiungi note o dettagli..."
            />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2.5 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {loading ? 'Salvataggio...' : 'Salva Scadenza'}
            </button>
            <Link
              href="/deadlines"
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
