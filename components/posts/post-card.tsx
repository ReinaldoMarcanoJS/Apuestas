'use client'

import { useState, useEffect, useCallback } from 'react'
import { PostWithProfile } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { likePost, unlikePost, isPostLiked, deletePost, getPostComments, addPostComment, getPostLikes } from '@/lib/supabase/posts'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CommentModal } from './comment-modal'
import { LikesModal } from './likes-modal'
import Image from 'next/image'
import { useUser } from '@/components/user-context'

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
  const { user } = useUser();
  const [isLiked, setIsLiked] = useState<boolean | null>(null) // null = loading, true/false = loaded
  const [likesCount, setLikesCount] = useState(post._count?.post_likes || 0)
  const [isLoading, setIsLoading] = useState(false)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false)
  const [likesUsers, setLikesUsers] = useState<LikeUser[]>([])
  const [showInlineCommentInput, setShowInlineCommentInput] = useState(false)
  const [inlineComment, setInlineComment] = useState("")
  const [inlineLoading, setInlineLoading] = useState(false)

  // Estado para el carrusel de imágenes
  const [currentImg, setCurrentImg] = useState(0)
  // Estados para el touch
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  // Configuración del swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Deslizar izquierda = siguiente imagen
      setCurrentImg((prev) => prev === post.image_urls.length - 1 ? 0 : prev + 1);
    }
    if (isRightSwipe) {
      // Deslizar derecha = imagen anterior
      setCurrentImg((prev) => prev === 0 ? post.image_urls.length - 1 : prev - 1);
    }
  };

  // Usar el id del usuario del contexto
  const currentUserId = user?.id || null;

  useEffect(() => {
    // checkCurrentUser(); // Eliminado
  }, [post.id]); // Eliminado

  const checkLikeStatus = useCallback(async () => {
    if (!currentUserId) return
    
    try {
      const liked = await isPostLiked(post.id, currentUserId)
      setIsLiked(liked)
      console.log('liked', liked)
    } catch (error) {
      console.error('Error checking like status:', error)
      setIsLiked(false) // En caso de error, asumir que no está liked
    }
  }, [currentUserId, post.id])

  useEffect(() => {
    if (currentUserId) {
      checkLikeStatus();
    } else {
      // Si no hay usuario, resetear el estado
      setIsLiked(null)
    }
  }, [currentUserId, post.id, checkLikeStatus]);



  const handleLike = async () => {
    if (!currentUserId || isLiked === null) return

    // Actualizar estado inmediatamente para mejor UX
    const newLikedState = !isLiked
    const newLikesCount = newLikedState ? likesCount + 1 : likesCount - 1
    
    setIsLiked(newLikedState)
    setLikesCount(newLikesCount)
    setIsLoading(true)
    
    try {
      if (newLikedState) {
        await likePost(post, currentUserId)
      } else {
        await unlikePost(post.id, currentUserId)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      // Revertir cambios si hay error
      setIsLiked(!newLikedState)
      setLikesCount(newLikedState ? likesCount : likesCount + 1)
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
    const normalized: Comment[] = (data || []).map((c: unknown) => {
      const user = (c as { user?: Partial<CommentUser> }).user;
      return {
        ...(c as Comment),
      user: {
          username: user?.username ?? '',
          display_name: user?.display_name ?? user?.username ?? '',
          avatar_url: user?.avatar_url ?? null
        }
      }
    })
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
    const normalized: LikeUser[] = (data || []).map((l: unknown) => {
      const user = (l as { user?: Partial<CommentUser> | Partial<CommentUser>[] }).user;
      let userObj: Partial<CommentUser> | undefined;
      if (Array.isArray(user)) {
        userObj = user[0];
      } else {
        userObj = user;
      }
      return {
        ...(l as LikeUser),
      user: {
          username: userObj?.username ?? '',
          display_name: userObj?.display_name ?? userObj?.username ?? '',
          avatar_url: userObj?.avatar_url ?? null
      }
      }
    })
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
          <div className="flex items-center ">
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

      <CardContent className="space-y-4 p-0" onClick={handleOpenComments} style={{ cursor: 'pointer' }}>
        {/* Content */}
        <div className="space-y-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap px-3">{post.content}</p>
          
          {/* Imagen o carrusel de imágenes */}
          {Array.isArray(post.image_urls) && post.image_urls.length > 0 && (
            <div
              className="w-full bg-gray-100 rounded-lg overflow-hidden flex flex-col items-center justify-center relative cursor-pointer max-w-full"
              style={post.image_urls.length > 1 ? { height: '320px', maxHeight: '320px' } : { minHeight: '220px' }}
              onClick={handleOpenComments}
            >
              <Image
                src={post.image_urls[currentImg]}
                alt={`Imagen ${currentImg + 1} de la publicación`}
                width={800} // Puedes ajustar este valor según el tamaño real de tus imágenes
                height={600} // Puedes ajustar este valor según el tamaño real de tus imágenes
                className={post.image_urls.length > 1 ? "w-full h-full bg-white object-contain max-w-full" : "w-full h-auto bg-white object-contain max-w-full"}
                style={{ display: 'block', background: 'white' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              />
              {post.image_urls.length > 1 && (
                <>
                  <button
                    type="button"
                    className="hidden sm:block absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-1 shadow hover:bg-opacity-100 transition"
                    onClick={e => { e.stopPropagation(); setCurrentImg((prev) => prev === 0 ? post.image_urls.length - 1 : prev - 1) }}
                    aria-label="Anterior"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    type="button"
                    className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-1 shadow hover:bg-opacity-100 transition"
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
        <div className="flex items-center justify-between text-sm text-muted-foreground px-3">
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
        <div className="flex gap-2 border-t " onClick={e => e.stopPropagation()}>
          <Button
            variant={isLiked ? "default" : "ghost"}
            size="lg"
            onClick={handleLike}
            disabled={isLoading || isLiked === null}
            className="flex-1"
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            {isLiked === null ? 'Cargando...' : (isLiked ? 'Me gusta' : 'Me gusta')}
          </Button>
          <Button variant="ghost" size="lg" className="flex-1" onClick={handleOpenCommentInput}>
            <MessageCircle className="h-4 w-4" />
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
            {comments.slice(-2).map((comment) => (
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
        onShowLikes={() => handleOpenLikes({ stopPropagation: () => {} } as unknown as React.MouseEvent<HTMLSpanElement, MouseEvent>)}
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