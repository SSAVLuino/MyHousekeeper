// apps/web/app/page.tsx
import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Home Deadlines</h1>
      <p>App di gestione scadenze</p>
      <Link href="/dashboard">Vai alla dashboard</Link>
    </main>
  )
}
