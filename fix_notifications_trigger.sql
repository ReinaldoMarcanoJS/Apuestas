-- =====================================================
-- FIX: CORREGIR TRIGGERS PROBLEMÁTICOS EN NOTIFICACIONES
-- =====================================================

-- Verificar si existe algún trigger que esté causando el problema
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'post_comments';

-- Verificar si existe algún trigger en notifications que use comment_id
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'notifications';

-- Verificar la estructura actual de la tabla notifications
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Si existe algún trigger problemático, eliminarlo
-- (Esto es temporal hasta que identifiquemos el trigger específico)
-- DROP TRIGGER IF EXISTS nombre_del_trigger ON public.post_comments;

-- Verificar si hay alguna función que esté causando el problema
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%comment_id%' 
AND routine_definition LIKE '%notifications%'; 

-- Agregar columna comment_id a la tabla notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notifications_comment_id ON public.notifications(comment_id); 