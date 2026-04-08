import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderKanban, Users, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import DeleteProjectButton from './DeleteProjectButton'

async function getProjects() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_members(count),
      assets(count),
      deadlines(count)
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return { projects: projects || [], user }
}

export default async function ProjectsPage() {
  const { projects } = await getProjects()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Progetti</h1>
          <p className="text-gray-600 mt-1">Gestisci i tuoi progetti</p>
        </div>
        <Link
          href="/projects/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link href={`/projects/${project.id}`} className="block p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FolderKanban className="h-6 w-6 text-primary-600" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                  {project.name}
                </h3>
                
                {project.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{project.project_members?.[0]?.count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FolderKanban className="h-4 w-4" />
                    <span>{project.assets?.[0]?.count || 0} asset</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Creato il {format(new Date(project.created_at), 'dd MMM yyyy', { locale: it })}
                  </p>
                </div>
              </Link>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Modifica
                </Link>
                <DeleteProjectButton projectId={project.id} projectName={project.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
