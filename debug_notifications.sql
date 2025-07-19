-- =====================================================
-- DEBUG: VERIFICAR NOTIFICACIONES
-- =====================================================

-- Ver todas las notificaciones existentes
SELECT 
    id,
    user_id,
    type,
    from_user_id,
    post_id,
    comment_id,
    is_read,
    created_at
FROM public.notifications 
ORDER BY created_at DESC 
LIMIT 20;

-- Ver notificaciones no leídas
SELECT 
    id,
    user_id,
    type,
    from_user_id,
    post_id,
    comment_id,
    is_read,
    created_at
FROM public.notifications 
WHERE is_read = false
ORDER BY created_at DESC;

-- Ver notificaciones con datos de usuario
SELECT 
    n.id,
    n.user_id,
    n.type,
    n.from_user_id,
    n.post_id,
    n.comment_id,
    n.is_read,
    n.created_at,
    u.username as from_username,
    u.display_name as from_display_name
FROM public.notifications n
LEFT JOIN public.profiles u ON n.from_user_id = u.id
ORDER BY n.created_at DESC 
LIMIT 10;

-- Verificar si hay triggers en la tabla notifications
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'notifications';

-- Verificar si hay triggers en post_comments que creen notificaciones
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'post_comments'
AND action_statement LIKE '%notifications%';

-- Verificar funciones que usen notifications
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%notifications%'
AND routine_definition LIKE '%INSERT%'; 

-- Verificar políticas RLS de notifications
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications'; 

-- Verificar si el trigger está activo
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'post_comments'
AND action_statement LIKE '%notifications%';

-- Verificar si hay notificaciones, crear una de prueba
SELECT COUNT(*) as total_notifications FROM public.notifications; 