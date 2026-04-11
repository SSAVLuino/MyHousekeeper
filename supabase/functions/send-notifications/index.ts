import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    console.log('=== send-notifications avviata ===')

    // ── Auth ────────────────────────────────────────────────
    const CRON_SECRET = Deno.env.get('CRON_SECRET')
    if (!CRON_SECRET) {
      console.error('CRON_SECRET mancante')
      return new Response('Server misconfigured', { status: 500 })
    }

    const cronHeader = req.headers.get('x-cron-secret')
    if (cronHeader !== CRON_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    // ── Env vars ────────────────────────────────────────────
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
    const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL')
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    console.log('Env check:', {
      supabaseUrl: !!SUPABASE_URL,
      serviceRole: !!SUPABASE_SERVICE_ROLE_KEY,
      vapidPublic: !!VAPID_PUBLIC_KEY,
      vapidPrivate: !!VAPID_PRIVATE_KEY,
      vapidEmail: !!VAPID_EMAIL,
      resend: !!RESEND_API_KEY,
    })

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase env mancanti' }), { status: 500 })
    }

    // ── Supabase client ─────────────────────────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const today = new Date().toISOString().split('T')[0]
    console.log('Cerco scadenze per data:', today)

    const { data: deadlines, error } = await supabase.rpc('get_deadlines_to_notify', {
      check_date: today,
    })

    if (error) {
      console.error('Errore RPC:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    console.log(`Scadenze trovate: ${deadlines?.length ?? 0}`)

    const results = { push: 0, email: 0, errors: 0 }

    for (const deadline of deadlines ?? []) {
      console.log(`Processo scadenza: ${deadline.title}`)

      // ── Push ──────────────────────────────────────────────
      if (deadline.notify_push && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_EMAIL) {
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth_key')
          .eq('user_id', deadline.user_id)

        console.log(`Subscriptions trovate: ${subs?.length ?? 0}`)

        const payload = JSON.stringify({
          title: `Scadenza: ${deadline.title}`,
          body: `Scade ${formatDaysLabel(deadline.notify_before_days)}`,
          url: `/deadlines/${deadline.id}`,
        })

        for (const sub of subs ?? []) {
          try {
            await sendWebPush(
              sub.endpoint,
              sub.p256dh,
              sub.auth_key,
              VAPID_PUBLIC_KEY,
              VAPID_PRIVATE_KEY,
              VAPID_EMAIL,
              payload
            )
            results.push++
            console.log('Push inviata con successo')
          } catch (pushErr: any) {
            console.error('Push error:', pushErr.message)
            if (pushErr.message?.includes('410') || pushErr.message?.includes('404')) {
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            }
            results.errors++
          }
        }
      }

      // ── Email ─────────────────────────────────────────────
      if (deadline.notify_email && deadline.user_email && RESEND_API_KEY) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'Scadix <onboarding@resend.dev>',
              to: [deadline.user_email],
              subject: `Promemoria: ${deadline.title}`,
              html: buildEmailHtml(deadline),
            }),
          })

          if (res.ok) {
            results.email++
            console.log('Email inviata con successo')
          } else {
            const err = await res.text()
            console.error('Email error:', err)
            results.errors++
          }
        } catch (emailErr: any) {
          console.error('Email exception:', emailErr.message)
          results.errors++
        }
      }

      // ── Aggiorna notify_sent_at ───────────────────────────
      await supabase
        .from('deadlines')
        .update({ notify_sent_at: new Date().toISOString() })
        .eq('id', deadline.id)
    }

    console.log('Risultati finali:', results)
    return new Response(
      JSON.stringify({ ok: true, processed: deadlines?.length ?? 0, results }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Errore non gestito:', err.message, err.stack)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

// ── Web Push manuale (senza npm:web-push) ──────────────────────────────────
// Usa l'API fetch diretta verso l'endpoint del browser con VAPID JWT

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidEmail: string,
  payload: string
): Promise<void> {
  // Importa la libreria web-push tramite esm.sh con compatibilità Deno
  const { default: webpush } = await import('https://esm.sh/web-push@3.6.7?target=deno')

  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

  await webpush.sendNotification(
    { endpoint, keys: { p256dh, auth } },
    payload
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDaysLabel(days: number): string {
  if (days === 1) return 'domani'
  if (days === 7) return 'tra 1 settimana'
  if (days === 14) return 'tra 2 settimane'
  if (days === 30) return 'tra 1 mese'
  return `tra ${days} giorni`
}

function buildEmailHtml(deadline: any): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#ea580c;margin-bottom:8px">📅 Promemoria Scadenza</h2>
      <h3 style="margin:0 0 16px">${deadline.title}</h3>
      <p style="color:#6b7280;margin:0 0 8px">
        <strong>Scade il:</strong> ${new Date(deadline.due_date).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' })}
      </p>
      ${deadline.project_name ? `<p style="color:#6b7280;margin:0 0 8px"><strong>Progetto:</strong> ${deadline.project_name}</p>` : ''}
      ${deadline.asset_name ? `<p style="color:#6b7280;margin:0 0 16px"><strong>Asset:</strong> ${deadline.asset_name}</p>` : ''}
      <a href="https://scadix.app/deadlines/${deadline.id}"
         style="display:inline-block;background:#ea580c;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
        Vedi scadenza →
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">Scadix — Gestione Asset e Scadenze</p>
    </div>
  `
}
