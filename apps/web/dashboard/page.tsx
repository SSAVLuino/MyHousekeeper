import { redirect } from 'next/navigation';
import { createServerSupabase } from '../../lib/supabase/server';

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect('/login');
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Dashboard</h1>
      <p>Benvenuto {data.user.email}</p>
    </main>
  );
}
