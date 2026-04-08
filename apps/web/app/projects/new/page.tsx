'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewProjectPage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { error } = await supabase.from('projects').insert({
      name,
      owner_id: user.id,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <main>
      <h1 style={{ marginBottom: 16 }}>
        Crea il tuo progetto
      </h1>

      <p style={{ marginBottom: 24 }}>
        Il progetto ti serve per organizzare scadenze,
        auto e casa.
      </p>

      <form onSubmit={handleCreate}>
        <input
          placeholder="Nome progetto (es. Casa, Famiglia, Auto)"
          value={name}
          required
          onChange={e => setName(e.target.value)}
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? 'Creazione...' : 'Crea progetto'}
        </button>

        {error && (
          <p style={{ color: 'red', marginTop: 12 }}>
            {error}
          </p>
        )}
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  marginBottom: 12,
  fontSize: 16,
  borderRadius: 6,
  border: '1px solid #ccc',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 16,
};
