'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getPost } from '@/lib/supabase/posts'
import { PostCard } from '@/components/posts/post-card'
import { PostWithProfile } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { MessageCircle, ArrowLeft } from 'lucide-react'

export default function PostDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<PostWithProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getPost(id as string).then((data) => {
      setPost(data)
      setLoading(false)
    })
  }, [id])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <span className="text-muted-foreground">Cargando publicación...</span>
    </div>
  )

  if (!post) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <span className="text-lg text-muted-foreground">Publicación no encontrada.</span>
      <Button className="mt-4" onClick={() => router.back()}>Volver</Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/60 to-white py-8 px-2">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={post.profiles.avatar_url || ''} alt={post.profiles.display_name} />
              <AvatarFallback>
                {post.profiles.display_name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{post.profiles.display_name}</div>
              <div className="text-xs text-muted-foreground">@{post.profiles.username}</div>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleString('es-ES')}
          </span>
        </div>
        {/* Título */}
        <h1 className="text-2xl font-bold mb-2">Detalle de publicación</h1>
        {/* Post */}
        <PostCard post={post} />
        {/* Comentarios */}
        <div className="mt-8 bg-muted/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-5 w-5" />
            <span className="font-semibold">Comentarios</span>
          </div>
          <div className="text-muted-foreground text-sm">
            Desliza hacia abajo para ver y agregar comentarios.
          </div>
        </div>
      </div>
    </div>
  )
} 