import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function AssetsPage() {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, name, type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">I tuoi asset</h1>

        <Link
          href="/assets/new"
          className="text-sm text-blue-400 hover:underline"
        >
          + Nuovo asset
        </Link>
      </div>

      {/* Content */}
      {!assets || assets.length === 0 ? (
        <p className="text-slate-400">
          Non hai ancora creato nessun asset.
        </p>
      ) : (
        <ul className="space-y-3">
          {assets.map(asset => (
            <li key={asset.id}>
              <Link
                href={`/assets/${asset.id}`}
                className="block rounded-lg bg-slate-800 p-4 hover:bg-slate-700 transition"
              >
                <div className="font-medium">{asset.name}</div>
                <div className="text-sm text-slate-400 capitalize">
                  Tipo: {asset.type}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
