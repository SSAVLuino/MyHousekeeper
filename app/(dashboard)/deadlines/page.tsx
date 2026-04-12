'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Calendar, AlertCircle, Filter, X, ChevronDown, ChevronUp, Pencil, ExternalLink } from 'lucide-react'
import { format, parseISO, isBefore, isToday } from 'date-fns'
import { it } from 'date-fns/locale'

interface Deadline {
  id: string
  title: string
  category: string
  due_date: string
  frequency: string | null
  notes: string | null
  project_id: string | null
  asset_id: string | null
  projects?: { id: string; name: string; owner_id: string } | null
  assets?: { name: string } | null
  userRole?: 'owner' | 'admin' | 'editor' | 'viewer'
}

interface Project {
  id: string
  name: string
}

interface Asset {
  id: string
  name: string
  project_id: string | null
}

function getDeadlineStatus(dueDate: string) {
  const date = parseISO(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (isBefore(date, today)) {
    return { label: 'Scaduta', color: 'text-red-600 bg-red-50 border-red-200' }
  } else if (isToday(date)) {
    return { label: 'Oggi', color: 'text-orange-600 bg-orange-50 border-orange-200' }
  } else {
    return { label: 'In scadenza', color: 'text-green-600 bg-green-50 border-green-200' }
  }
}

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtri
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedAsset, setSelectedAsset] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Quando cambia il progetto, resetta l'asset se non appartiene al progetto selezionato
    if (selectedProject && selectedAsset) {
      const asset = assets.find(a => a.id === selectedAsset)
      if (asset?.project_id !== selectedProject) {
        setSelectedAsset('')
      }
    }
  }, [selectedProject, selectedAsset, assets])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('=== loadDeadlines Debug ===')
      console.log('user.id:', user.id)

      // Carica progetti owned
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_id', user.id)

      const ownedProjectIds = ownedProjects?.map(p => p.id) || []
      console.log('Owned projects:', ownedProjectIds.length)

      // Carica progetti member
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', user.id)

      const memberProjectIds = memberships?.map(m => m.project_id) || []
      console.log('Member projects:', memberProjectIds.length)

      // Carica nomi progetti member
      let memberProjects: Project[] = []
      if (memberProjectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', memberProjectIds)
        
        memberProjects = data || []
      }

      // Combina tutti i progetti accessibili
      const allProjects = [...(ownedProjects || []), ...memberProjects]
      setProjects(allProjects)

      const allProjectIds = Array.from(new Set([...ownedProjectIds, ...memberProjectIds]))
      console.log('Total accessible projects:', allProjectIds.length)

      // Carica scadenze da tutti i progetti accessibili
      const { data: deadlinesData } = await supabase
        .from('deadlines')
        .select(`
          *,
          projects(id, name, owner_id),
          assets(name)
        `)
        .in('project_id', allProjectIds.length > 0 ? allProjectIds : ['00000000-0000-0000-0000-000000000000'])
        .order('due_date', { ascending: true })

      console.log('Deadlines loaded:', deadlinesData?.length || 0)

      // Aggiungi ruolo a ogni deadline
      const deadlinesWithRole = (deadlinesData || []).map(deadline => {
        let userRole = 'viewer'
        if (deadline.projects?.owner_id === user.id) {
          userRole = 'owner'
        } else {
          const membership = memberships?.find(m => m.project_id === deadline.project_id)
          userRole = membership?.role || 'viewer'
        }
        
        return { ...deadline, userRole }
      })

      setDeadlines(deadlinesWithRole)
      console.log('=== End Debug ===\n')

      // Carica assets
      const { data: assetsData } = await supabase
        .from('assets')
        .select('id, name, project_id')
        .in('project_id', allProjectIds.length > 0 ? allProjectIds : ['00000000-0000-0000-0000-000000000000'])
        .order('name')

      setAssets(assetsData || [])
    } catch (error) {
      console.error('Errore caricamento:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtra le scadenze
  const filteredDeadlines = deadlines.filter(deadline => {
    if (selectedProject && deadline.project_id !== selectedProject) return false
    if (selectedAsset && deadline.asset_id !== selectedAsset) return false
    return true
  })

  const overdueDeadlines = filteredDeadlines.filter(d => isBefore(parseISO(d.due_date), new Date()))
  const upcomingDeadlines = filteredDeadlines.filter(d => !isBefore(parseISO(d.due_date), new Date()))

  // Assets filtrati per progetto selezionato
  const availableAssets = selectedProject 
    ? assets.filter(a => a.project_id === selectedProject)
    : assets

  const deleteDeadline = async (id: string) => {
    if (!window.confirm('Eliminare questa scadenza? L\'operazione non è reversibile.')) return
    setDeletingId(id)
    await supabase.from('deadlines').delete().eq('id', id)
    setDeletingId(null)
    setExpandedId(null)
    loadData()
  }

  const canEdit = (userRole?: string) => ['owner', 'admin', 'editor'].includes(userRole || '')

  const clearFilters = () => {
    setSelectedProject('')
    setSelectedAsset('')
  }

  const hasActiveFilters = selectedProject || selectedAsset

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scadenze</h1>
          <p className="text-gray-600 mt-1">Gestisci le tue scadenze</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              hasActiveFilters
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-5 w-5" />
            Filtri
            {hasActiveFilters && (
              <span className="bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {(selectedProject ? 1 : 0) + (selectedAsset ? 1 : 0)}
              </span>
            )}
          </button>
          <Link
            href="/deadlines/new"
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nuova Scadenza
          </Link>
        </div>
      </div>

      {/* Filtri */}
      {showFilters && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filtra Scadenze</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Rimuovi filtri
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progetto
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Tutti i progetti</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset
              </label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={!selectedProject && assets.length > 20}
              >
                <option value="">Tutti gli asset</option>
                {availableAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
              {!selectedProject && assets.length > 20 && (
                <p className="text-xs text-gray-500 mt-1">
                  Seleziona prima un progetto per filtrare per asset
                </p>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-gray-600">Filtri attivi:</span>
              {selectedProject && (
                <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded">
                  {projects.find(p => p.id === selectedProject)?.name}
                </span>
              )}
              {selectedAsset && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                  {assets.find(a => a.id === selectedAsset)?.name}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Risultati */}
      {filteredDeadlines.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasActiveFilters ? 'Nessuna scadenza trovata' : 'Nessuna scadenza'}
          </h3>
          <p className="text-gray-600 mb-6">
            {hasActiveFilters 
              ? 'Prova a modificare i filtri' 
              : 'Inizia creando la tua prima scadenza'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
            >
              <X className="h-5 w-5" />
              Rimuovi Filtri
            </button>
          ) : (
            <Link
              href="/deadlines/new"
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Crea Scadenza
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Scadenze scadute */}
          {overdueDeadlines.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
              <div className="bg-red-50 px-6 py-4 border-b border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h2 className="text-lg font-semibold text-red-900">
                    Scadenze Scadute ({overdueDeadlines.length})
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {overdueDeadlines.map((deadline) => {
                  const status = getDeadlineStatus(deadline.due_date)
                  const isExpanded = expandedId === deadline.id
                  const isDeleting = deletingId === deadline.id
                  return (
                    <div key={deadline.id} className={`transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : deadline.id)}
                        className="w-full text-left px-4 py-4 hover:bg-red-50/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${status.color}`}>
                                {status.label}
                              </span>
                              <h3 className="font-medium text-gray-900 truncate">{deadline.title}</h3>
                            </div>
                            <p className="text-sm font-medium text-red-600">
                              {format(parseISO(deadline.due_date), 'dd MMM yyyy', { locale: it })}
                            </p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 bg-red-50/30 border-t border-red-100">
                          <dl className="mt-3 space-y-2 text-sm">
                            <div className="flex gap-2">
                              <dt className="text-gray-500 w-24 flex-shrink-0">Categoria</dt>
                              <dd className="text-gray-900">{deadline.category}</dd>
                            </div>
                            {deadline.frequency && (
                              <div className="flex gap-2">
                                <dt className="text-gray-500 w-24 flex-shrink-0">Ricorrenza</dt>
                                <dd className="text-gray-900">{deadline.frequency}</dd>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <dt className="text-gray-500 w-24 flex-shrink-0">Progetto</dt>
                              <dd className="text-gray-900">{deadline.projects?.name || deadline.assets?.name || 'N/A'}</dd>
                            </div>
                            {deadline.notes && (
                              <div className="flex gap-2">
                                <dt className="text-gray-500 w-24 flex-shrink-0">Note</dt>
                                <dd className="text-gray-600 line-clamp-2">{deadline.notes}</dd>
                              </div>
                            )}
                          </dl>
                          <div className="mt-4 flex items-center gap-2">
                            <Link
                              href={`/deadlines/${deadline.id}`}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-white transition-colors text-gray-700"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Dettagli
                            </Link>
                            {canEdit(deadline.userRole) && (
                              <>
                                <Link
                                  href={`/deadlines/${deadline.id}/edit`}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-primary-300 hover:bg-primary-50 transition-colors text-primary-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Modifica
                                </Link>
                                <button
                                  onClick={() => deleteDeadline(deadline.id)}
                                  disabled={isDeleting}
                                  title="Elimina"
                                  className="flex items-center justify-center p-1.5 rounded-lg border border-red-300 hover:bg-red-50 transition-colors text-red-700 disabled:opacity-50"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Scadenze future */}
          {upcomingDeadlines.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Prossime Scadenze ({upcomingDeadlines.length})
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {upcomingDeadlines.map((deadline) => {
                  const status = getDeadlineStatus(deadline.due_date)
                  const isExpanded = expandedId === deadline.id
                  const isDeleting = deletingId === deadline.id
                  const dateColor = isToday(parseISO(deadline.due_date)) ? 'text-orange-600' : 'text-gray-900'
                  return (
                    <div key={deadline.id} className={`transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : deadline.id)}
                        className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${status.color}`}>
                                {status.label}
                              </span>
                              <h3 className="font-medium text-gray-900 truncate">{deadline.title}</h3>
                            </div>
                            <p className={`text-sm font-medium ${dateColor}`}>
                              {format(parseISO(deadline.due_date), 'dd MMM yyyy', { locale: it })}
                            </p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100">
                          <dl className="mt-3 space-y-2 text-sm">
                            <div className="flex gap-2">
                              <dt className="text-gray-500 w-24 flex-shrink-0">Categoria</dt>
                              <dd className="text-gray-900">{deadline.category}</dd>
                            </div>
                            {deadline.frequency && (
                              <div className="flex gap-2">
                                <dt className="text-gray-500 w-24 flex-shrink-0">Ricorrenza</dt>
                                <dd className="text-gray-900">{deadline.frequency}</dd>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <dt className="text-gray-500 w-24 flex-shrink-0">Progetto</dt>
                              <dd className="text-gray-900">{deadline.projects?.name || deadline.assets?.name || 'N/A'}</dd>
                            </div>
                            {deadline.notes && (
                              <div className="flex gap-2">
                                <dt className="text-gray-500 w-24 flex-shrink-0">Note</dt>
                                <dd className="text-gray-600 line-clamp-2">{deadline.notes}</dd>
                              </div>
                            )}
                          </dl>
                          <div className="mt-4 flex items-center gap-2">
                            <Link
                              href={`/deadlines/${deadline.id}`}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-white transition-colors text-gray-700"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Dettagli
                            </Link>
                            {canEdit(deadline.userRole) && (
                              <>
                                <Link
                                  href={`/deadlines/${deadline.id}/edit`}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-primary-300 hover:bg-primary-50 transition-colors text-primary-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Modifica
                                </Link>
                                <button
                                  onClick={() => deleteDeadline(deadline.id)}
                                  disabled={isDeleting}
                                  title="Elimina"
                                  className="flex items-center justify-center p-1.5 rounded-lg border border-red-300 hover:bg-red-50 transition-colors text-red-700 disabled:opacity-50"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
