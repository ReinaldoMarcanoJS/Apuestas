-- =====================================================
-- ESQUEMA DE BASE DE DATOS PARA RED SOCIAL DE APOSTADORES (VERSIÓN CORREGIDA)
-- =====================================================

-- Habilitar la extensión UUID si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLA DE PERFILES (extensión de auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLA DE PUBLICACIONES (muro de usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABLA DE PARTIDOS DE FÚTBOL
-- =====================================================
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    league TEXT NOT NULL,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('upcoming', 'live', 'finished')) DEFAULT 'upcoming',
    home_score INTEGER,
    away_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABLA DE PREDICCIONES DE USUARIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    predicted_home_score INTEGER NOT NULL,
    predicted_away_score INTEGER NOT NULL,
    confidence INTEGER CHECK (confidence >= 1 AND confidence <= 10) DEFAULT 5,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, match_id)
);

-- =====================================================
-- 5. TABLA DE ESTADÍSTICAS DE USUARIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    accuracy_percentage DECIMAL(5,2) DEFAULT 0.00,
    total_points INTEGER DEFAULT 0,
    rank_position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. TABLA DE LIKES EN PUBLICACIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- =====================================================
-- 7. TABLA DE COMENTARIOS EN PUBLICACIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. TABLA DE SEGUIDORES (para seguir usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.followers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZAR CONSULTAS
-- =====================================================

-- Índices para posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- Índices para matches
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date);

-- Índices para predictions
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON public.predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON public.predictions(created_at);

-- Índices para user_stats
CREATE INDEX IF NOT EXISTS idx_user_stats_points ON public.user_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_accuracy ON public.user_stats(accuracy_percentage DESC);

-- Índices para followers
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON public.followers(following_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para generar username único
CREATE OR REPLACE FUNCTION generate_unique_username()
RETURNS TEXT AS $$
DECLARE
    username TEXT;
    counter INTEGER := 1;
BEGIN
    -- Intentar con el email base
    username := split_part(auth.jwt() ->> 'email', '@', 1);
    
    -- Si el username ya existe, agregar números
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE profiles.username = username) LOOP
        username := split_part(auth.jwt() ->> 'email', '@', 1) || counter::TEXT;
        counter := counter + 1;
    END LOOP;
    
    RETURN username;
END;
$$ language 'plpgsql';

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
        NEW.id,
        generate_unique_username(),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    
    -- Crear estadísticas iniciales
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para actualizar contador de likes
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Función para actualizar estadísticas de usuario
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estadísticas cuando se inserta una nueva predicción
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.user_stats (user_id, total_predictions)
        VALUES (NEW.user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET
            total_predictions = user_stats.total_predictions + 1;
    END IF;
    
    -- Actualizar estadísticas cuando se actualiza una predicción (cuando el partido termina)
    IF TG_OP = 'UPDATE' AND OLD.is_correct IS NULL AND NEW.is_correct IS NOT NULL THEN
        UPDATE public.user_stats SET
            correct_predictions = CASE WHEN NEW.is_correct THEN correct_predictions + 1 ELSE correct_predictions END,
            total_points = total_points + COALESCE(NEW.points_earned, 0),
            accuracy_percentage = CASE 
                WHEN total_predictions > 0 THEN 
                    ROUND((correct_predictions::DECIMAL / total_predictions::DECIMAL) * 100, 2)
                ELSE 0 
            END
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS (con manejo de errores)
-- =====================================================

-- Trigger para crear perfil automáticamente cuando se registra un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers para updated_at (con manejo de errores)
DO $$ 
BEGIN
    -- Eliminar triggers existentes si existen
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
    DROP TRIGGER IF EXISTS update_matches_updated_at ON public.matches;
    DROP TRIGGER IF EXISTS update_user_stats_updated_at ON public.user_stats;
    DROP TRIGGER IF EXISTS update_post_comments_updated_at ON public.post_comments;
    
    -- Crear triggers
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Trigger para likes
DROP TRIGGER IF EXISTS update_post_likes_count_trigger ON public.post_likes;
CREATE TRIGGER update_post_likes_count_trigger
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Trigger para estadísticas
DROP TRIGGER IF EXISTS update_user_stats_trigger ON public.predictions;
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE ON public.predictions
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view all posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;

DROP POLICY IF EXISTS "Users can view all matches" ON public.matches;
DROP POLICY IF EXISTS "Admin can manage matches" ON public.matches;

DROP POLICY IF EXISTS "Users can view all predictions" ON public.predictions;
DROP POLICY IF EXISTS "Users can create own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Users can update own predictions" ON public.predictions;

DROP POLICY IF EXISTS "Users can view all stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;

DROP POLICY IF EXISTS "Users can view all likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can create likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON public.post_likes;

DROP POLICY IF EXISTS "Users can view all comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;

DROP POLICY IF EXISTS "Users can view all followers" ON public.followers;
DROP POLICY IF EXISTS "Users can create follows" ON public.followers;
DROP POLICY IF EXISTS "Users can delete own follows" ON public.followers;

-- Crear políticas
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view all posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admin can manage matches" ON public.matches FOR ALL USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE username = 'admin'
));

CREATE POLICY "Users can view all predictions" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Users can create own predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON public.predictions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all stats" ON public.user_stats FOR SELECT USING (true);
CREATE POLICY "Users can update own stats" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can create likes" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all followers" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users can create follows" ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete own follows" ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================

-- Insertar algunos partidos de ejemplo (solo si no existen)
INSERT INTO public.matches (home_team, away_team, league, match_date, status) 
SELECT 'Real Madrid', 'Barcelona', 'La Liga', NOW() + INTERVAL '2 days', 'upcoming'
WHERE NOT EXISTS (SELECT 1 FROM public.matches WHERE home_team = 'Real Madrid' AND away_team = 'Barcelona' AND match_date = NOW() + INTERVAL '2 days');

INSERT INTO public.matches (home_team, away_team, league, match_date, status) 
SELECT 'Manchester United', 'Liverpool', 'Premier League', NOW() + INTERVAL '3 days', 'upcoming'
WHERE NOT EXISTS (SELECT 1 FROM public.matches WHERE home_team = 'Manchester United' AND away_team = 'Liverpool' AND match_date = NOW() + INTERVAL '3 days');

INSERT INTO public.matches (home_team, away_team, league, match_date, status) 
SELECT 'Bayern Munich', 'Borussia Dortmund', 'Bundesliga', NOW() + INTERVAL '1 day', 'upcoming'
WHERE NOT EXISTS (SELECT 1 FROM public.matches WHERE home_team = 'Bayern Munich' AND away_team = 'Borussia Dortmund' AND match_date = NOW() + INTERVAL '1 day');

INSERT INTO public.matches (home_team, away_team, league, match_date, status) 
SELECT 'PSG', 'Marseille', 'Ligue 1', NOW() + INTERVAL '4 days', 'upcoming'
WHERE NOT EXISTS (SELECT 1 FROM public.matches WHERE home_team = 'PSG' AND away_team = 'Marseille' AND match_date = NOW() + INTERVAL '4 days');

INSERT INTO public.matches (home_team, away_team, league, match_date, status) 
SELECT 'Juventus', 'AC Milan', 'Serie A', NOW() + INTERVAL '5 days', 'upcoming'
WHERE NOT EXISTS (SELECT 1 FROM public.matches WHERE home_team = 'Juventus' AND away_team = 'AC Milan' AND match_date = NOW() + INTERVAL '5 days');

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

/*
ESTRUCTURA CREADA:

1. profiles - Perfiles de usuarios (se crean automáticamente)
2. posts - Publicaciones del muro
3. matches - Partidos de fútbol
4. predictions - Predicciones de usuarios
5. user_stats - Estadísticas y rankings
6. post_likes - Likes en publicaciones
7. post_comments - Comentarios en publicaciones
8. followers - Sistema de seguimiento

FUNCIONALIDADES INCLUIDAS:
- RLS (Row Level Security) para seguridad
- Triggers automáticos para contadores y estadísticas
- Creación automática de perfiles al registrarse
- Índices para optimizar consultas
- Datos de ejemplo para empezar a probar
- Manejo de errores para triggers y políticas existentes

PRÓXIMOS PASOS:
1. Ejecutar este SQL en tu proyecto de Supabase
2. Probar el registro de usuarios
3. Verificar que se creen perfiles automáticamente
*/ 