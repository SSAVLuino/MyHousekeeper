import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FolderKanban, Package, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO, isBefore, addDays } from 'date-fns'
import { it } from 'date-fns/locale'

async function getDashboardData() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Progetti owned
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)

  const ownedProjectIds = ownedProjects?.map(p => p.id) || []

  // Progetti member
  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', user.id)

  const memberProjectIds = memberships?.map(m => m.project_id) || []

  // Combina tutti i progetti accessibili
  const allProjectIds = Array.from(new Set([...ownedProjectIds, ...memberProjectIds]))

  // Statistiche
  const { count: projectsCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .or(`owner_id.eq.${user.id},id.in.(${memberProjectIds.join(',')})`)

  const { count: assetsCount } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .in('project_id', allProjectIds.length > 0 ? allProjectIds : ['00000000-0000-0000-0000-000000000000'])

  const { count: deadlinesCount } = await supabase
    .from('deadlines')
    .select('*', { count: 'exact', head: true })
    .in('project_id', allProjectIds.length > 0 ? allProjectIds : ['00000000-0000-0000-0000-000000000000'])

  const today = new Date().toISOString().split('T')[0]

  // Scadenze scadute (passate e non completate)
  const { data: overdueDeadlines } = await supabase
    .from('deadlines')
    .select(`
      *,
      assets(name),
      projects(name)
    `)
    .in('project_id', allProjectIds.length > 0 ? allProjectIds : ['00000000-0000-0000-0000-000000000000'])
    .lt('due_date', today)
    .order('due_date', { ascending: false })
    .limit(5)

  // Scadenze imminenti (oggi + prossimi 7 giorni)
  const nextWeek = addDays(new Date(), 7).toISOString().split('T')[0]

  const { data: upcomingDeadlines } = await supabase
    .from('deadlines')
    .select(`
      *,
      assets(name),
      projects(name)
    `)
    .in('project_id', allProjectIds.length > 0 ? allProjectIds : ['00000000-0000-0000-0000-000000000000'])
    .gte('due_date', today)
    .lte('due_date', nextWeek)
    .order('due_date', { ascending: true })
    .limit(5)

  // Se non ci sono scadenze imminenti, prendi le prossime 5 in assoluto
  let nextDeadlines = upcomingDeadlines || []
  if (nextDeadlines.length === 0) {
    const { data: futureDeadlines } = await supabase
      .from('deadlines')
      .select(`
        *,
        assets(name),
        projects(name)
      `)
      .in('project_id', allProjectIds.length > 0 ? allProjectIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(5)
    
    nextDeadlines = futureDeadlines || []
  }

  return {
    user,
    stats: {
      projects: projectsCount || 0,
      assets: assetsCount || 0,
      deadlines: deadlinesCount || 0,
    },
    upcomingDeadlines: nextDeadlines,
    overdueDeadlines: overdueDeadlines || [],
  }
}

export default async function DashboardPage() {
  const { user, stats, upcomingDeadlines, overdueDeadlines } = await getDashboardData()

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Benvenuto, {user.email}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8">
        <Link href="/projects" className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-2 sm:mb-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Progetti</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.projects}</p>
            </div>
            <div className="h-8 w-8 sm:h-12 sm:w-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <FolderKanban className="h-4 w-4 sm:h-6 sm:w-6 text-primary-600" />
            </div>
          </div>
        </Link>

        <Link href="/assets" className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-2 sm:mb-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Asset</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.assets}</p>
            </div>
            <div className="h-8 w-8 sm:h-12 sm:w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
            </div>
          </div>
        </Link>

        <Link href="/deadlines" className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-2 sm:mb-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Scadenze</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.deadlines}</p>
            </div>
            <div className="h-8 w-8 sm:h-12 sm:w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600" />
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scadenze Scadute */}
        {overdueDeadlines.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-semibold text-red-900">Scadenze Scadute</h2>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {overdueDeadlines.map((deadline: any) => (
                <Link
                  key={deadline.id}
                  href={`/deadlines/${deadline.id}`}
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{deadline.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {deadline.projects?.name || deadline.assets?.name || 'Nessun progetto'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        {format(parseISO(deadline.due_date), 'dd MMM yyyy', { locale: it })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{deadline.category}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Scadenze Imminenti */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Prossime Scadenze</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((deadline: any) => {
                const dueDate = parseISO(deadline.due_date)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const isToday = dueDate.getTime() === today.getTime()
                
                return (
                  <Link
                    key={deadline.id}
                    href={`/deadlines/${deadline.id}`}
                    className={`block px-6 py-4 hover:bg-gray-50 transition-colors ${
                      isToday ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{deadline.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {deadline.projects?.name || deadline.assets?.name || 'Nessun progetto'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          isToday ? 'text-orange-700 font-bold' : 'text-primary-600'
                        }`}>
                          {isToday ? 'OGGI' : format(dueDate, 'dd MMM yyyy', { locale: it })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{deadline.category}</p>
                      </div>
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nessuna scadenza imminente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">     
        <Link
          href="/deadlines/new"
          className="bg-orange-600 text-white rounded-lg p-4 text-center font-medium hover:bg-orange-700 transition-colors"
        >
          + Nuova Scadenza
        </Link>
      </div>
    </div>
  )
}
