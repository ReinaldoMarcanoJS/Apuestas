-- =====================================================
-- VERIFICAR Y CORREGIR SOPORTE PARA RESPUESTAS A COMENTARIOS
-- =====================================================

-- Verificar si la columna parent_comment_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'post_comments' 
        AND column_name = 'parent_comment_id'
    ) THEN
        -- Agregar la columna si no existe
        ALTER TABLE public.post_comments 
        ADD COLUMN parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Columna parent_comment_id agregada a post_comments';
    ELSE
        RAISE NOTICE 'Columna parent_comment_id ya existe en post_comments';
    END IF;
END $$;

-- Verificar si la tabla comment_likes existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'comment_likes'
    ) THEN
        -- Crear la tabla si no existe
        CREATE TABLE public.comment_likes (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE NOT NULL,
            user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(comment_id, user_id)
        );
        
        -- Habilitar RLS
        ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
        
        -- Crear políticas
        CREATE POLICY "Users can view all comment likes" ON public.comment_likes FOR SELECT USING (true);
        CREATE POLICY "Users can create comment likes" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can delete own comment likes" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);
        
        -- Crear índices
        CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
        CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);
        
        RAISE NOTICE 'Tabla comment_likes creada';
    ELSE
        RAISE NOTICE 'Tabla comment_likes ya existe';
    END IF;
END $$;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON public.post_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_main ON public.post_comments(post_id) WHERE parent_comment_id IS NULL;

-- Verificar que las políticas de post_comments permiten parent_comment_id
-- Las políticas existentes deberían funcionar, pero vamos a verificar que no hay restricciones adicionales

-- Mostrar información de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'post_comments' 
ORDER BY ordinal_position; 