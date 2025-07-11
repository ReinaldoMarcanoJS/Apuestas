"use client";
import { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  from_user_id: string;
  post_id?: string;
  is_read: boolean;
  created_at: string;
  from_user?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Traer notificaciones y datos del usuario que generó la acción
    const { data, error } = await supabase
      .from('notifications')
      .select('*, from_user:from_user_id (username, display_name, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setNotifications(data);
      // Marcar todas como leídas
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const renderText = (n: Notification) => {
    if (n.type === 'follow') return 'te ha seguido';
    if (n.type === 'like') return 'le ha dado me gusta a tu publicación';
    if (n.type === 'comment') return 'ha comentado en tu publicación';
    return n.type;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Notificaciones</h1>
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-gray-100 animate-pulse flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-300" />
                <div className="flex-1 h-4 bg-gray-300 rounded" />
              </div>
              <div className="h-3 w-32 bg-gray-200 rounded mt-2" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center text-muted-foreground">No tienes notificaciones.</div>
      ) : (
        <ul className="space-y-4">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-center gap-4 bg-white rounded-lg shadow p-4">
              <Link href={`/profile/${n.from_user?.username || ''}`} className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={n.from_user?.avatar_url || ''} alt={n.from_user?.display_name || ''} />
                  <AvatarFallback>{n.from_user?.display_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <span className="font-semibold">{n.from_user?.display_name || 'Alguien'}</span>
              </Link>
              <span className="flex-1 text-sm">
                {renderText(n)}
                {n.post_id && (
                  <Link href={`/posts/${n.post_id}`} className="ml-1 underline text-blue-600">Ver publicación</Link>
                )}
              </span>
              <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)} title="Eliminar notificación">
                ×
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 