'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewAssetPage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState('');
  const [type, setType] = useState('car');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single();

    const { error } = await supabase.from('assets').insert({
      name,
      type,
      user_id: user.id,
      project_id: project.id,
      details: {
        description,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/assets');
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Nuovo asset</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full rounded bg-slate-800 p-3 text-sm"
          placeholder="Nome asset"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <select
          className="w-full rounded bg-slate-800 p-3 text-sm"
          value={type}
          onChange={e => setType(e.target.value)}
        >
          <option value="car">Auto</option>
          <option value="home">Casa</option>
          <option value="other">Altro</option>
        </select>

        <textarea
          className="w-full rounded bg-slate-800 p-3 text-sm"
          placeholder="Descrizione (opzionale)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 p-3 text-sm font-semibold"
        >
          {loading ? 'Salvataggio…' : 'Crea asset'}
        </button>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </form>
    </div>
  );
}
