-- =====================================================
-- FIX: AGREGAR SOPORTE PARA RESPUESTAS A COMENTARIOS
-- =====================================================

-- Agregar columna parent_comment_id a la tabla post_comments
ALTER TABLE public.post_comments 
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Crear índice para optimizar consultas de respuestas
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON public.post_comments(parent_comment_id);

-- Crear índice para comentarios principales (sin parent_comment_id)
CREATE INDEX IF NOT EXISTS idx_post_comments_main ON public.post_comments(post_id) WHERE parent_comment_id IS NULL;

-- Crear tabla para likes de comentarios si no existe
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Habilitar RLS en comment_likes
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Políticas para comment_likes
CREATE POLICY "Users can view all comment likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can create comment likes" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comment likes" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Índices para comment_likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id); 