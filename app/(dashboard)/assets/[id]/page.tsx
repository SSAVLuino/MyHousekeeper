import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Calendar, Package, Shield } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { getProjectPermissions, formatRoleName, getRoleBadgeColor } from '@/lib/permissionsHelper'

async function getAsset(id: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: asset, error } = await supabase
    .from('assets')
    .select(`
      *,
      projects(
        id,
        name,
        owner_id
      ),
      deadlines(
        id,
        title,
        due_date,
        category
      )
    `)
    .eq('id', id)
    .single()

  if (error || !asset) notFound()

  // Calcola i permessi dell'utente sul progetto
  const permissions = await getProjectPermissions(supabase, asset.project_id, user.id)
  
  // Se non ha accesso, blocca
  if (!permissions.canView) {
    notFound()
  }

  return { asset, user, permissions }
}

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const { asset, user, permissions } = await getAsset(params.id)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href="/assets"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna agli asset
        </Link>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{asset.name}</h1>
                <span className={`text-xs px-3 py-1 rounded-full border flex-shrink-0 ${getRoleBadgeColor(permissions.role)}`}>
                  <Shield className="h-3 w-3 inline mr-1" />
                  {formatRoleName(permissions.role)}
                </span>
              </div>
              <p className="text-gray-600">{asset.type}</p>
              <p className="text-sm text-gray-500 mt-1">
                Creato il {format(new Date(asset.created_at), 'dd MMMM yyyy', { locale: it })}
              </p>
            </div>
          </div>

          {permissions.canEditAssets && (
            <Link
              href={`/assets/${asset.id}/edit`}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors sm:flex-shrink-0"
            >
              <Edit className="h-5 w-5" />
              Modifica
            </Link>
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
                <label className="text-sm font-medium text-gray-500">Progetto</label>
                <p className="text-gray-900 mt-1">
                  <Link 
                    href={`/projects/${asset.projects?.id}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {asset.projects?.name || 'N/A'}
                  </Link>
                </p>
              </div>

              {asset.details && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Informazioni Aggiuntive</label>
                  <div className="mt-2 bg-gray-50 rounded-lg p-4">
                    {typeof asset.details === 'object' ? (
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                        {JSON.stringify(asset.details, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-gray-900">{asset.details}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scadenze associate */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Scadenze</h2>
                <span className="text-sm text-gray-500">({asset.deadlines?.length || 0})</span>
              </div>
              <Link
                href={`/deadlines/new?project_id=${asset.project_id}&asset_id=${asset.id}`}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                + Aggiungi
              </Link>
            </div>
            <div className="divide-y divide-gray-200">
              {asset.deadlines && asset.deadlines.length > 0 ? (
                asset.deadlines.map((deadline: any) => (
                  <Link
                    key={deadline.id}
                    href={`/deadlines/${deadline.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{deadline.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{deadline.category}</p>
                      </div>
                      <p className="text-sm font-medium text-orange-600">
                        {format(new Date(deadline.due_date), 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nessuna scadenza</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar con info rapide */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Riepilogo</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Tipo Asset</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {asset.type}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Scadenze Attive</dt>
                <dd className="text-2xl font-bold text-gray-900 mt-1">{asset.deadlines?.length || 0}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Creato il</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {format(new Date(asset.created_at), 'dd MMM yyyy', { locale: it })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
