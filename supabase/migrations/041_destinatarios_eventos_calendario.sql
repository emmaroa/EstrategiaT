ALTER TABLE public.eventos_calendario ADD COLUMN IF NOT EXISTS destinatarios UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE public.eventos_calendario DROP CONSTRAINT IF EXISTS eventos_calendario_alcance_check;
ALTER TABLE public.eventos_calendario ADD CONSTRAINT eventos_calendario_alcance_check CHECK (alcance IN ('Personal', 'Todos', 'Seleccionados'));
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_destinatarios ON public.eventos_calendario USING GIN (destinatarios);
