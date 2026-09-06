ALTER TABLE public.eventos_calendario ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#07b1bc';
ALTER TABLE public.eventos_calendario DROP CONSTRAINT IF EXISTS eventos_calendario_color_check;
ALTER TABLE public.eventos_calendario ADD CONSTRAINT eventos_calendario_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
