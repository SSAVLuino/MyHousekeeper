import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { format, parseISO, isBefore } from 'date-fns'
import { it } from 'date-fns/locale'
import CompleteDeadlineButton from './CompleteDeadlineButton'

async function getDeadline(id: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: deadline, error } = await supabase
    .from('deadlines')
    .select(`
      *,
      projects(id, name),
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

  // Ordina i logs per data decrescente
  if (deadline.deadline_logs) {
    deadline.deadline_logs.sort((a: any, b: any) => 
      new Date(b.done_at).getTime() - new Date(a.done_at).getTime()
    )
  }

  return { deadline, user }
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
  const { deadline } = await getDeadline(params.id)
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
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{deadline.title}</h1>
                <div className="flex items-center gap-2 mt-1">
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
          </div>
          
          <CompleteDeadlineButton 
            deadlineId={deadline.id} 
            currentDueDate={deadline.due_date}
            frequency={deadline.frequency}
          />
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
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
