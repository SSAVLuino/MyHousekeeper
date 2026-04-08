'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="w-full max-w-sm rounded-xl bg-slate-800 p-6 shadow-xl">
      <h1 className="mb-6 text-center text-2xl font-semibold">
        Accedi
      </h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full rounded-md bg-slate-700 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full rounded-md bg-slate-700 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 py-3 text-sm font-medium hover:bg-blue-700 transition"
        >
          {loading ? 'Accesso...' : 'Login'}
        </button>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </form>

     <p className="mt-6 text-center text-sm text-slate-400">
      Non hai un account?{' '}
      <a href="/signup" className="text-blue-400 hover:underline">
        Registrati
      </a>
    </p>
    </div>
  );
}
