'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderKanban, Users, ChevronDown, ChevronUp, ExternalLink, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import DeleteProjectButton from './[id]/DeleteProjectButton'

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-primary-100 text-primary-700 border-primary-300',
  admin: 'bg-purple-100 text-purple-700 border-purple-300',
  editor: 'bg-blue-100 text-blue-700 border-blue-300',
  viewer: 'bg-gray-100 text-gray-700 border-gray-300',
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Proprietario',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

export default function ProjectsList({ projects }: { projects: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-200">
        {projects.map((project) => {
          const isExpanded = expandedId === project.id
          const canEdit = project.userRole === 'owner' || project.userRole === 'admin'

          return (
            <div key={project.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : project.id)}
                className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-medium text-gray-900 truncate">{project.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${ROLE_BADGE[project.userRole] || ROLE_BADGE.viewer}`}>
                          {ROLE_LABEL[project.userRole] || project.userRole}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {project.project_members?.[0]?.count || 0} membri
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" />
                          {project.assets?.[0]?.count || 0} asset
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  }
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 bg-gray-50/50 border-t border-gray-100">
                  <dl className="mt-3 space-y-2 text-sm">
                    {project.description && (
                      <div className="flex gap-2">
                        <dt className="text-gray-500 w-24 flex-shrink-0">Descrizione</dt>
                        <dd className="text-gray-900 line-clamp-2">{project.description}</dd>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <dt className="text-gray-500 w-24 flex-shrink-0">Creato il</dt>
                      <dd className="text-gray-900">
                        {format(new Date(project.created_at), 'dd MMM yyyy', { locale: it })}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-white transition-colors text-gray-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Dettagli
                    </Link>
                    {canEdit && (
                      <Link
                        href={`/projects/${project.id}/edit`}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-primary-300 hover:bg-primary-50 transition-colors text-primary-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifica
                      </Link>
                    )}
                    {project.userRole === 'owner' && (
                      <DeleteProjectButton projectId={project.id} projectName={project.name} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
