-- =====================================================
-- FIX: AGREGAR COLUMNA COMMENT_ID A NOTIFICACIONES
-- =====================================================

-- Agregar columna comment_id a la tabla notifications si no existe
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notifications_comment_id ON public.notifications(comment_id);

-- Verificar la estructura actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position; 