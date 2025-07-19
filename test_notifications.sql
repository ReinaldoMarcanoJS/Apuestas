-- =====================================================
-- TEST: PROBAR CREACIÓN DE NOTIFICACIONES
-- =====================================================

-- Obtener un usuario de ejemplo
SELECT id, username, display_name FROM public.profiles LIMIT 1;

-- Obtener un post de ejemplo
SELECT id, user_id, content FROM public.posts LIMIT 1;

-- Crear una notificación de prueba manualmente
-- (Reemplaza los UUIDs con valores reales de tu base de datos)
INSERT INTO public.notifications (
    user_id, 
    from_user_id, 
    type, 
    post_id, 
    comment_id,
    is_read
) VALUES (
    'USER_ID_AQUI',  -- ID del usuario que recibe la notificación
    'FROM_USER_ID_AQUI',  -- ID del usuario que genera la notificación
    'comment',
    'POST_ID_AQUI',  -- ID del post
    'COMMENT_ID_AQUI',  -- ID del comentario (opcional)
    false
);

-- Verificar que la notificación se creó
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
LIMIT 5; 