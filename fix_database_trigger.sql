-- =====================================================
-- ARREGLAR TRIGGER PARA CREACIÓN AUTOMÁTICA DE PERFILES
-- =====================================================

-- 1. Eliminar el trigger existente si hay problemas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Eliminar la función existente
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Crear una función más simple y robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    username_base TEXT;
    username TEXT;
    counter INTEGER := 1;
BEGIN
    -- Generar username base del email
    username_base := split_part(NEW.email, '@', 1);
    username := username_base;
    
    -- Buscar un username único
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE profiles.username = username) LOOP
        username := username_base || counter::TEXT;
        counter := counter + 1;
    END LOOP;
    
    -- Insertar perfil
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
        NEW.id,
        username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', username_base)
    );
    
    -- Insertar estadísticas iniciales
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error (opcional)
        RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear el trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verificar que las políticas RLS permitan inserción
-- Eliminar políticas existentes que puedan estar bloqueando
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;

-- 6. Crear políticas más permisivas para la creación automática
CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for all users" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Enable update for users based on id" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 7. Políticas para user_stats
CREATE POLICY "Enable insert for authenticated users only" ON public.user_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable select for all users" ON public.user_stats
    FOR SELECT USING (true);

CREATE POLICY "Enable update for users based on user_id" ON public.user_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- 8. Verificar que las tablas tengan RLS habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- 9. Crear perfiles manualmente para usuarios existentes (si los hay)
-- Esto es opcional, solo si ya tienes usuarios sin perfiles
INSERT INTO public.profiles (id, username, display_name)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Crear estadísticas para usuarios sin stats
INSERT INTO public.user_stats (user_id)
SELECT 
    au.id
FROM auth.users au
LEFT JOIN public.user_stats us ON au.id = us.user_id
WHERE us.user_id IS NULL; 