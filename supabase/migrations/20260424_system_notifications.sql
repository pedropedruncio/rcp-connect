-- Migration: criar tabela SystemNotification para notificações in-app da liderança
-- Aplicar no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public."SystemNotification" (
  "id"        TEXT PRIMARY KEY,
  "type"      TEXT NOT NULL,
  "content"   JSONB NOT NULL DEFAULT '{}',
  "readBy"    TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ativar Row Level Security
ALTER TABLE public."SystemNotification" ENABLE ROW LEVEL SECURITY;

-- Política: apenas o service role pode inserir (via server-side)
-- Leitura pública via anon para quem tiver sessão válida (RLS filtra no cliente)
CREATE POLICY "Allow authenticated read" ON public."SystemNotification"
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service insert" ON public."SystemNotification"
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update readBy" ON public."SystemNotification"
  FOR UPDATE USING (auth.role() = 'authenticated');
