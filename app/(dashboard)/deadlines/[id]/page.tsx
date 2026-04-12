import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, CheckCircle2, Clock, Shield, Bell, Mail, BellOff } from 'lucide-react'
import { format, parseISO, isBefore } from 'date-fns'
import { it } from 'date-fns/locale'
import CompleteDeadlineButton from './CompleteDeadlineButton'
import { getProjectPermissions, formatRoleName, getRoleBadgeColor } from '@/lib/permissionsHelper'

async function getDeadline(id: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: deadline, error } = await supabase
    .from('deadlines')
    .select(`
      *,
      projects(id, name, owner_id),
      assets(id, name),
      deadline_logs(
        id,
        done_at,
        notes
      )
    `)
    .eq('id', id)
    .single()

  if (error || !deadline) notFound()

  // Calcola i permessi dell'utente sul progetto
  const permissions = await getProjectPermissions(supabase, deadline.project_id, user.id)
  
  // Se non ha accesso, blocca
  if (!permissions.canView) {
    notFound()
  }

  // Ordina i logs per data decrescente
  if (deadline.deadline_logs) {
    deadline.deadline_logs.sort((a: any, b: any) => 
      new Date(b.done_at).getTime() - new Date(a.done_at).getTime()
    )
  }

  return { deadline, user, permissions }
}

function getDeadlineStatus(dueDate: string) {
  const date = parseISO(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (isBefore(date, today)) {
    return { label: 'Scaduta', color: 'bg-red-100 text-red-700' }
  } else {
    return { label: 'Attiva', color: 'bg-green-100 text-green-700' }
  }
}

export default async function DeadlineDetailPage({ params }: { params: { id: string } }) {
  const { deadline, user, permissions } = await getDeadline(params.id)
  const status = getDeadlineStatus(deadline.due_date)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href="/deadlines"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alle scadenze
        </Link>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{deadline.title}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className={`text-xs px-3 py-1 rounded-full border ${getRoleBadgeColor(permissions.role)}`}>
                  <Shield className="h-3 w-3 inline mr-1" />
                  {formatRoleName(permissions.role)}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${status.color}`}>
                  {status.label}
                </span>
                <span className="text-sm text-gray-600">{deadline.category}</span>
                {deadline.frequency && (
                  <span className="text-sm text-gray-600">• {deadline.frequency}</span>
                )}
              </div>
            </div>
          </div>

          {permissions.canEditDeadlines && (
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <Link
                href={`/deadlines/${deadline.id}/edit`}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Modifica
              </Link>
              <CompleteDeadlineButton
                deadlineId={deadline.id}
                currentDueDate={deadline.due_date}
                frequency={deadline.frequency}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informazioni principali */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dettagli */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dettagli</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Data Scadenza</label>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {format(parseISO(deadline.due_date), 'dd MMMM yyyy', { locale: it })}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Progetto</label>
                <p className="text-gray-900 mt-1">
                  {deadline.projects ? (
                    <Link 
                      href={`/projects/${deadline.projects.id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {deadline.projects.name}
                    </Link>
                  ) : 'N/A'}
                </p>
              </div>

              {deadline.assets && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Asset</label>
                  <p className="text-gray-900 mt-1">
                    <Link 
                      href={`/assets/${deadline.assets.id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {deadline.assets.name}
                    </Link>
                  </p>
                </div>
              )}

              {deadline.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Note</label>
                  <p className="text-gray-900 mt-2 bg-gray-50 rounded-lg p-4">
                    {deadline.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Storico completamenti */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Storico Completamenti</h2>
              <span className="text-sm text-gray-500">({deadline.deadline_logs?.length || 0})</span>
            </div>
            <div className="divide-y divide-gray-200">
              {deadline.deadline_logs && deadline.deadline_logs.length > 0 ? (
                deadline.deadline_logs.map((log: any) => (
                  <div key={log.id} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Completato il {format(parseISO(log.done_at), 'dd MMMM yyyy', { locale: it })}
                        </p>
                        {log.notes && (
                          <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nessun completamento registrato</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Riepilogo</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Categoria</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {deadline.category}
                  </span>
                </dd>
              </div>
              {deadline.frequency && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ricorrenza</dt>
                  <dd className="text-sm text-gray-900 mt-1">{deadline.frequency}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Completamenti</dt>
                <dd className="text-2xl font-bold text-gray-900 mt-1">
                  {deadline.deadline_logs?.length || 0}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Creata il</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {format(new Date(deadline.created_at), 'dd MMM yyyy', { locale: it })}
                </dd>
              </div>

              {/* Notifiche */}
              <div className="pt-3 border-t border-gray-100">
                <dt className="text-sm font-medium text-gray-500 mb-2">Notifiche</dt>
                {deadline.notify_before_days ? (
                  <dd className="space-y-2">
                    <p className="text-sm text-gray-900">
                      {deadline.notify_before_days === 1 && '1 giorno prima'}
                      {deadline.notify_before_days === 3 && '3 giorni prima'}
                      {deadline.notify_before_days === 7 && '1 settimana prima'}
                      {deadline.notify_before_days === 14 && '2 settimane prima'}
                      {deadline.notify_before_days === 30 && '1 mese prima'}
                    </p>
                    <div className="flex gap-3">
                      {deadline.notify_push && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Bell className="h-3 w-3" />
                          Push
                        </span>
                      )}
                      {deadline.notify_email && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          <Mail className="h-3 w-3" />
                          Email
                        </span>
                      )}
                    </div>
                  </dd>
                ) : (
                  <dd className="flex items-center gap-1.5 text-sm text-gray-400">
                    <BellOff className="h-4 w-4" />
                    Disattivate
                  </dd>
                )}
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
