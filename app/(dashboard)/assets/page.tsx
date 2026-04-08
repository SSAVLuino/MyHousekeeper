import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Package } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import DeleteAssetButton from './DeleteAssetButton'

async function getAssets() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Ottieni i progetti dell'utente
  const { data: userProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)

  const projectIds = userProjects?.map(p => p.id) || []

  const { data: assets, error } = await supabase
    .from('assets')
    .select(`
      *,
      projects(name)
    `)
    .in('project_id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false })

  return { assets: assets || [] }
}

export default async function AssetsPage() {
  const { assets } = await getAssets()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset</h1>
          <p className="text-gray-600 mt-1">Gestisci i tuoi asset</p>
        </div>
        <Link
          href="/assets/new"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nuovo Asset
        </Link>
      </div>

      {/* Assets Table */}
      {assets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun asset</h3>
          <p className="text-gray-600 mb-6">Inizia creando il tuo primo asset</p>
          <Link
            href="/assets/new"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Crea Asset
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progetto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creato il
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map((asset: any) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/assets/${asset.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-700">
                      {asset.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{asset.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{asset.projects?.name || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(asset.created_at), 'dd MMM yyyy', { locale: it })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link
                      href={`/assets/${asset.id}/edit`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Modifica
                    </Link>
                    <DeleteAssetButton assetId={asset.id} assetName={asset.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
