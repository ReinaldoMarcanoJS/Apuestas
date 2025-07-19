-- =====================================================
-- CORRECCIONES PARA LA API DE FÚTBOL
-- =====================================================

-- Agregar campos faltantes a la tabla matches
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS external_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS home_logo TEXT,
ADD COLUMN IF NOT EXISTS away_logo TEXT,
ADD COLUMN IF NOT EXISTS start_timestamp INTEGER,
ADD COLUMN IF NOT EXISTS api_status TEXT;

-- Crear tabla de control de peticiones a la API
CREATE TABLE IF NOT EXISTS public.api_football_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_football_requests ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para las nuevas tablas
DROP POLICY IF EXISTS "Leagues are viewable by everyone" ON public.leagues;
DROP POLICY IF EXISTS "Leagues can be inserted by authenticated users" ON public.leagues;
DROP POLICY IF EXISTS "API requests are viewable by everyone" ON public.api_football_requests;
DROP POLICY IF EXISTS "API requests can be inserted by authenticated users" ON public.api_football_requests;

CREATE POLICY "Leagues are viewable by everyone" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Leagues can be inserted by authenticated users" ON public.leagues FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "API requests are viewable by everyone" ON public.api_football_requests FOR SELECT USING (true);
CREATE POLICY "API requests can be inserted by authenticated users" ON public.api_football_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 