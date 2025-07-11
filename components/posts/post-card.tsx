'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostWithProfile } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { likePost, unlikePost, isPostLiked, deletePost } from '@/lib/supabase/posts'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PostCardProps {
  post: PostWithProfile
  onPostDeleted?: () => void
  onPostUpdated?: () => void
}

export function PostCard({ post, onPostDeleted, onPostUpdated }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkCurrentUser()
    checkLikeStatus()
  }, [post.id])

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  const checkLikeStatus = async () => {
    if (!currentUserId) return
    
    const liked = await isPostLiked(post.id, currentUserId)
    setIsLiked(liked)
  }

  const handleLike = async () => {
    if (!currentUserId) return

    setIsLoading(true)
    
    try {
      if (isLiked) {
        await unlikePost(post.id, currentUserId)
        setLikesCount(prev => prev - 1)
        setIsLiked(false)
      } else {
        await likePost(post.id, currentUserId)
        setLikesCount(prev => prev + 1)
        setIsLiked(true)
      }
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

      <CardContent className="space-y-4">
        {/* Content */}
        <div className="space-y-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
          
          {post.image_url && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={post.image_url}
                alt="Post image"
                className="w-full h-auto max-h-96 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Heart className="h-4 w-4" />
              <span>{likesCount}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span>{post._count?.post_comments || 0}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2 border-t">
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
          
          <Button variant="ghost" size="sm" className="flex-1">
            <MessageCircle className="h-4 w-4 mr-2" />
            Comentar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 