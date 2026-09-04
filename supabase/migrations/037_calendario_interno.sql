-- Calendario interno para reuniones y eventos; los vencimientos de tickets se leen de acuerdos.
CREATE TABLE IF NOT EXISTS public.eventos_calendario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(180) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'Evento' CHECK (tipo IN ('Reunión', 'Evento')),
  alcance VARCHAR(20) NOT NULL DEFAULT 'Todos' CHECK (alcance IN ('Personal', 'Todos')),
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  ubicacion VARCHAR(300),
  creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  creado_por_nombre TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT eventos_calendario_fechas_validas CHECK (fecha_fin >= fecha_inicio)
);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_fechas ON public.eventos_calendario (fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_eventos_calendario_creador ON public.eventos_calendario (creado_por);
ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.eventos_calendario TO anon, authenticated;
DROP POLICY IF EXISTS "eventos_calendario_acceso_aplicacion" ON public.eventos_calendario;
CREATE POLICY "eventos_calendario_acceso_aplicacion" ON public.eventos_calendario FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
