-- ============================================================
-- MIGRATION: Notifiche sulle scadenze
-- Eseguire nel SQL Editor di Supabase
-- ============================================================

-- 1. Aggiunge colonne di notifica alla tabella deadlines
ALTER TABLE public.deadlines
  ADD COLUMN IF NOT EXISTS notify_before_days INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notify_push        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_email       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_sent_at     TIMESTAMPTZ DEFAULT NULL;

-- Commenti descrittivi
COMMENT ON COLUMN public.deadlines.notify_before_days IS 'Giorni prima della scadenza in cui inviare la notifica (NULL = notifiche disabilitate)';
COMMENT ON COLUMN public.deadlines.notify_push        IS 'Invia notifica push al dispositivo';
COMMENT ON COLUMN public.deadlines.notify_email       IS 'Invia notifica via email';
COMMENT ON COLUMN public.deadlines.notify_sent_at     IS 'Timestamp dell ultimo invio notifica (per evitare duplicati)';

-- Indice per il cron job che cerca scadenze da notificare
CREATE INDEX IF NOT EXISTS idx_deadlines_notify
  ON public.deadlines (notify_before_days, notify_sent_at, due_date)
  WHERE notify_before_days IS NOT NULL;


-- ============================================================
-- 2. Tabella push_subscriptions (endpoint dispositivo per utente)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL,
  p256dh     TEXT        NOT NULL,   -- chiave pubblica ECDH del browser
  auth_key   TEXT        NOT NULL,   -- authentication secret
  user_agent TEXT        DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

COMMENT ON TABLE  public.push_subscriptions           IS 'Sottoscrizioni push Web Push API per utente/dispositivo';
COMMENT ON COLUMN public.push_subscriptions.p256dh    IS 'Chiave pubblica ECDH del browser (base64url)';
COMMENT ON COLUMN public.push_subscriptions.auth_key  IS 'Authentication secret (base64url)';

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- VERIFICA (opzionale, esegui dopo la migration)
-- ============================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'deadlines'
-- AND column_name LIKE 'notify%';
--
-- SELECT * FROM public.push_subscriptions LIMIT 5;
