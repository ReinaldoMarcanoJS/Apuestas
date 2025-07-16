'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostWithProfile } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { likePost, unlikePost, isPostLiked, deletePost, getPost, getPostComments, addPostComment, getPostLikes } from '@/lib/supabase/posts'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CommentModal } from './comment-modal'
import { LikesModal } from './likes-modal'

interface CommentUser {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  user: CommentUser;
  content: string;
  created_at: string;
}

interface LikeUser {
  id: string;
  user: CommentUser;
}

interface PostCardProps {
  post: PostWithProfile
  onPostDeleted?: () => void
  onPostUpdated?: () => void
}

export function PostCard({ post, onPostDeleted, onPostUpdated }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post._count?.post_likes || 0)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false)
  const [likesUsers, setLikesUsers] = useState<LikeUser[]>([])
  const [showInlineCommentInput, setShowInlineCommentInput] = useState(false)
  const [inlineComment, setInlineComment] = useState("")
  const [inlineLoading, setInlineLoading] = useState(false)
  const supabase = createClient()

  // Estado para el carrusel de imágenes
  const [currentImg, setCurrentImg] = useState(0)

  useEffect(() => {
    checkCurrentUser();
  }, [post.id]);

  useEffect(() => {
    if (currentUserId) {
      checkLikeStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, post.id]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  const checkLikeStatus = async () => {
    if (!currentUserId) return
    
    const liked = await isPostLiked(post.id, currentUserId)
    setIsLiked(liked)
  }

  const reloadPost = async () => {
    const freshPost = await getPost(post.id);
    if (freshPost) {
      setLikesCount(freshPost._count?.post_likes || 0);
      // Si quieres actualizar más campos, agrégalos aquí
    }
  };

  const handleLike = async () => {
    if (!currentUserId) return

    setIsLoading(true)
    try {
      if (isLiked) {
        setLikesCount(prev => prev - 1); // Actualiza localmente
        setIsLiked(false)
        await unlikePost(post.id, currentUserId)
      } else {
        setLikesCount(prev => prev + 1); // Actualiza localmente
        setIsLiked(true)
        await likePost(post, currentUserId)
      }
      // Sincroniza con la base de datos en segundo plano
      reloadPost();
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) return

    setIsLoading(true)
    
    try {
      const success = await deletePost(post.id)
      if (success) {
        onPostDeleted?.()
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return 'Hace unos minutos'
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }
  }

  const isOwnPost = currentUserId === post.user_id

  // Simulación: cargar comentarios (aquí deberías llamar a tu API real)
  const loadComments = async () => {
    const data = await getPostComments(post.id)
    const normalized: Comment[] = (data || []).map((c: any) => ({
      ...c,
      user: {
        username: c.user?.username,
        display_name: c.user?.display_name || c.user?.username,
        avatar_url: c.user?.avatar_url
      }
    }))
    setComments(normalized)
  }

  const handleOpenComments = async () => {
    await loadComments()
    setIsCommentModalOpen(true)
  }

  const handleAddComment = async (content: string) => {
    if (!currentUserId) return
    const newComment = await addPostComment(post.id, currentUserId, content)
    if (newComment) {
      const normalized: Comment = {
        ...newComment,
        user: {
          username: newComment.user?.username,
          display_name: newComment.user?.display_name || newComment.user?.username,
          avatar_url: newComment.user?.avatar_url
        }
      }
      setComments(prev => [...prev, normalized])
    }
  }

  const handleOpenLikes = async (e: React.MouseEvent<HTMLSpanElement, MouseEvent> | { stopPropagation: () => void }) => {
    e.stopPropagation()
    const data = await getPostLikes(post.id)
    const normalized: LikeUser[] = (data || []).map((l: any) => ({
      ...l,
      user: {
        username: Array.isArray(l.user) ? l.user[0]?.username : l.user?.username,
        display_name: Array.isArray(l.user) ? l.user[0]?.display_name || l.user[0]?.username : l.user?.display_name || l.user?.username,
        avatar_url: Array.isArray(l.user) ? l.user[0]?.avatar_url : l.user?.avatar_url
      }
    }))
    setLikesUsers(normalized)
    setIsLikesModalOpen(true)
  }

  const handleOpenCommentInput = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowInlineCommentInput(true)
  }

  const handleInlineCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inlineComment.trim() || !currentUserId) return
    setInlineLoading(true)
    const newComment = await addPostComment(post.id, currentUserId, inlineComment)
    if (newComment) {
      setComments(prev => [...prev, {
        ...newComment,
        user: Array.isArray(newComment.user) ? newComment.user[0] : newComment.user
      }])
      setInlineComment("")
      setShowInlineCommentInput(false)
    }
    setInlineLoading(false)
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href={`/profile/${post.profiles.username}`}>
              <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={post.profiles.avatar_url || ''} alt={post.profiles.display_name} />
                <AvatarFallback>
                  {post.profiles.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link href={`/profile/${post.profiles.username}`} className="hover:underline">
                <p className="font-semibold cursor-pointer">{post.profiles.display_name}</p>
              </Link>
              <p className="text-sm text-muted-foreground">
                @{post.profiles.username} • {formatDate(post.created_at)}
              </p>
            </div>
          </div>
          
          {isOwnPost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPostUpdated?.()}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4" onClick={handleOpenComments} style={{ cursor: 'pointer' }}>
        {/* Content */}
        <div className="space-y-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
          
          {/* Imagen o carrusel de imágenes */}
          {Array.isArray(post.image_urls) && post.image_urls.length > 0 && (
            <div
              className="w-full bg-gray-100 rounded-lg overflow-hidden flex flex-col items-center justify-center relative cursor-pointer"
              style={{ minHeight: '220px', maxHeight: '400px' }}
              onClick={handleOpenComments}
            >
              <img
                src={post.image_urls[currentImg]}
                alt={`Imagen ${currentImg + 1} de la publicación`}
                className="max-w-full h-auto bg-white object-contain"
                style={{ display: 'block', background: 'white', maxHeight: '400px' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              {post.image_urls.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-1 shadow hover:bg-opacity-100 transition"
                    onClick={e => { e.stopPropagation(); setCurrentImg((prev) => prev === 0 ? post.image_urls.length - 1 : prev - 1) }}
                    aria-label="Anterior"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-1 shadow hover:bg-opacity-100 transition"
                    onClick={e => { e.stopPropagation(); setCurrentImg((prev) => prev === post.image_urls.length - 1 ? 0 : prev + 1) }}
                    aria-label="Siguiente"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {post.image_urls.map((_, idx) => (
                      <span key={idx} className={`w-2 h-2 rounded-full ${idx === currentImg ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Heart className="h-4 w-4" />
              <span onClick={handleOpenLikes} className="hover:underline cursor-pointer">{likesCount}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span>{post._count?.post_comments || 0}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2 border-t" onClick={e => e.stopPropagation()}>
          <Button
            variant={isLiked ? "default" : "ghost"}
            size="sm"
            onClick={handleLike}
            disabled={isLoading}
            className="flex-1"
          >
            <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
            {isLiked ? 'Me gusta' : 'Me gusta'}
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={handleOpenCommentInput}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Comentar
          </Button>
        </div>
        {showInlineCommentInput && (
          <form onSubmit={handleInlineCommentSubmit} className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={inlineComment}
              onChange={e => setInlineComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 border rounded px-3 py-2 text-sm"
              maxLength={300}
              autoFocus
              disabled={inlineLoading}
            />
            <Button type="submit" size="sm" disabled={inlineLoading || !inlineComment.trim()}>
              Comentar
            </Button>
          </form>
        )}
        {/* Lista de últimos comentarios */}
        {comments.length > 0 && (
          <div className="mt-3 space-y-2">
            {comments.slice(-2).map((comment, idx) => (
              <div key={comment.id} className="flex items-start space-x-2 text-sm">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={comment.user?.avatar_url || ''} alt={comment.user?.username || ''} />
                  <AvatarFallback>{comment.user?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <span className="font-semibold">{comment.user?.username || 'Usuario'}</span>{' '}
                  <span className="text-muted-foreground">{comment.content}</span>
                  <div className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString('es-ES')}</div>
                </div>
              </div>
            ))}
            {comments.length > 2 && (
              <button
                className="text-xs text-blue-600 hover:underline mt-1"
                onClick={async (e) => {
                  e.stopPropagation();
                  await loadComments();
                  setIsCommentModalOpen(true);
                }}
              >
                Ver todos los comentarios
              </button>
            )}
          </div>
        )}
      </CardContent>
      <CommentModal
        open={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        comments={comments}
        onAddComment={handleAddComment}
        postInfo={{
          id: post.id,
          user: {
            username: post.profiles.username,
            display_name: post.profiles.display_name,
            avatar_url: post.profiles.avatar_url,
          },
          created_at: post.created_at,
          content: post.content,
          likes: likesCount,
          comments: comments.length,
        }}
        onShowLikes={() => handleOpenLikes({ stopPropagation: () => {} } as any)}
        imageUrls={post.image_urls}
        initialImageIndex={currentImg}
      />
      <LikesModal
        open={isLikesModalOpen}
        onClose={() => setIsLikesModalOpen(false)}
        likes={likesUsers}
      />
    </Card>
  )
} 