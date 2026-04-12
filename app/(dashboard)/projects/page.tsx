import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderKanban } from 'lucide-react'
import ProjectsList from './ProjectsList'

export const dynamic = 'force-dynamic'

async function getProjects() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  console.log('=== getProjects Debug ===')
  console.log('user.id:', user.id)

  // Query 1: Progetti di cui sei proprietario
  const { data: ownedProjects, error: ownedError } = await supabase
    .from('projects')
    .select(`
      *,
      project_members!inner(count),
      assets(count)
    `)
    .eq('owner_id', user.id)

  console.log('Owned projects:', ownedProjects?.length || 0)
  if (ownedError) console.error('Owned error:', ownedError)

  // Aggiungi ruolo 'owner' ai progetti owned
  const ownedWithRole = (ownedProjects || []).map(p => ({ ...p, userRole: 'owner' }))

  // Query 2: ID progetti in cui sei membro (con ruolo)
  const { data: memberships, error: memberError } = await supabase
    .from('project_members')
    .select('project_id, role')
    .eq('user_id', user.id)

  console.log('Memberships found:', memberships?.length || 0, memberships)
  if (memberError) console.error('Member error:', memberError)

  // Query 3: Carica i progetti da memberships
  let memberProjects = []
  if (memberships && memberships.length > 0) {
    const projectIds = memberships.map(m => m.project_id)
    console.log('Loading projects for IDs:', projectIds)
    
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members!inner(count),
        assets(count)
      `)
      .in('id', projectIds)

    console.log('Member projects loaded:', data?.length || 0)
    if (error) console.error('Member projects error:', error)
    
    // Aggiungi il ruolo ai progetti membro
    memberProjects = (data || []).map(p => {
      const membership = memberships.find(m => m.project_id === p.id)
      return { ...p, userRole: membership?.role || 'viewer' }
    })
  }

  // Combina e rimuovi duplicati
  const allProjects = [...ownedWithRole, ...memberProjects]
  const uniqueProjects = Array.from(
    new Map(allProjects.map(p => [p.id, p])).values()
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  console.log('Total unique projects:', uniqueProjects.length)
  console.log('=== End Debug ===\n')

  return { projects: uniqueProjects }
}

export default async function ProjectsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  const { projects } = await getProjects()

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3">
        <div>
          <h1 className="page-title">Progetti</h1>
          <p className="page-subtitle">Gestisci i tuoi progetti</p>
        </div>
        <Link
          href="/projects/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          Nuovo Progetto
        </Link>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FolderKanban className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun progetto</h3>
          <p className="text-gray-600 mb-6">Inizia creando il tuo primo progetto</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Crea Progetto
          </Link>
        </div>
      ) : (
        <ProjectsList projects={projects} />
      )}
    </div>
  )
}
