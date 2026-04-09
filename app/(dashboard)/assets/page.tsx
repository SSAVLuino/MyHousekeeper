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

  console.log('=== getAssets Debug ===')
  console.log('user.id:', user.id)

  // Query 1: Progetti di cui sei proprietario
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)

  const ownedProjectIds = ownedProjects?.map(p => p.id) || []
  console.log('Owned project IDs:', ownedProjectIds.length)

  // Query 2: Progetti in cui sei membro
  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id, role')
    .eq('user_id', user.id)

  const memberProjectIds = memberships?.map(m => m.project_id) || []
  console.log('Member project IDs:', memberProjectIds.length)

  // Combina tutti gli ID progetti accessibili
  const allProjectIds = [...new Set([...ownedProjectIds, ...memberProjectIds])]
  console.log('Total accessible projects:', allProjectIds.length)

  // Query 3: Carica asset da tutti i progetti accessibili
  const { data: assets, error } = await supabase
    .from('assets')
    .select(`
      *,
      projects(id, name, owner_id)
    `)
    .in('project_id', allProjectIds.length > 0 ? allProjectIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false })

  console.log('Assets loaded:', assets?.length || 0)
  if (error) console.error('Assets error:', error)

  // Aggiungi il ruolo dell'utente per ogni asset
  const assetsWithRole = (assets || []).map(asset => {
    // Determina il ruolo
    let userRole = 'viewer'
    if (asset.projects?.owner_id === user.id) {
      userRole = 'owner'
    } else {
      const membership = memberships?.find(m => m.project_id === asset.project_id)
      userRole = membership?.role || 'viewer'
    }
    
    return { ...asset, userRole }
  })

  console.log('=== End Debug ===\n')

  return { assets: assetsWithRole, userId: user.id }
}

export default async function AssetsPage() {
  const { assets, userId } = await getAssets()

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
                  Ruolo
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {asset.userRole === 'owner' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700 border border-primary-300">
                        Proprietario
                      </span>
                    )}
                    {asset.userRole === 'admin' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300">
                        Admin
                      </span>
                    )}
                    {asset.userRole === 'editor' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                        Editor
                      </span>
                    )}
                    {asset.userRole === 'viewer' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                        Viewer
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(asset.created_at), 'dd MMM yyyy', { locale: it })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    {/* Modifica: owner, admin, editor */}
                    {(asset.userRole === 'owner' || asset.userRole === 'admin' || asset.userRole === 'editor') && (
                      <Link
                        href={`/assets/${asset.id}/edit`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        Modifica
                      </Link>
                    )}
                    
                    {/* Elimina: solo owner e admin */}
                    {(asset.userRole === 'owner' || asset.userRole === 'admin') && (
                      <DeleteAssetButton assetId={asset.id} assetName={asset.name} />
                    )}
                    
                    {/* Viewer: nessuna azione */}
                    {asset.userRole === 'viewer' && (
                      <span className="text-gray-400 text-xs">Solo lettura</span>
                    )}
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
