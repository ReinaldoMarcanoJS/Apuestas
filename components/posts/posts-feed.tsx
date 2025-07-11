'use client'

import { useState, useEffect } from 'react'
import { PostWithProfile } from '@/lib/types/database'
import { getPosts, getPostsByUser } from '@/lib/supabase/posts'
import { PostCard } from './post-card'
import { CreatePost } from './create-post'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'

interface PostsFeedProps {
  userId?: string // If provided, shows only posts from this user
  showCreatePost?: boolean
}

export function PostsFeed({ userId, showCreatePost = true }: PostsFeedProps) {
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')

  const loadPosts = async (offset = 0, append = false) => {
    try {
      let newPosts: PostWithProfile[]
      if (userId) {
        newPosts = await getPostsByUser(userId, 20, offset)
      } else {
        newPosts = await getPosts(20, offset)
      }
      
      if (append) {
        setPosts(prev => [...prev, ...newPosts])
      } else {
        setPosts(newPosts)
      }
      
      setHasMore(newPosts.length === 20)
    } catch (error) {
      console.error('Error loading posts:', error)
      setError('Error al cargar las publicaciones')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    loadPosts(posts.length, true)
  }

  const handlePostCreated = () => {
    // Reload posts to show the new one at the top
    loadPosts()
  }

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts(prev => prev.filter(post => post.id !== deletedPostId))
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError('')
    loadPosts()
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-8 animate-fade-in">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-muted rounded-lg p-4 animate-pulse flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-300" />
              <div className="flex-1 h-4 bg-gray-300 rounded" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mt-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="flex gap-2 mt-2">
              <div className="h-8 w-20 bg-gray-200 rounded" />
              <div className="h-8 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 animate-fade-in">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2 animate-spin-slow" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 transition-all duration-300 animate-fade-in">
      {showCreatePost && (
        <div className="animate-fade-in-up duration-500">
          <CreatePost onPostCreated={handlePostCreated} />
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-8 animate-fade-in">
          <p className="text-muted-foreground">
            {userId ? 'Este usuario aún no ha publicado nada.' : 'No hay publicaciones aún.'}
          </p>
          {!userId && (
            <p className="text-sm text-muted-foreground mt-2">
              ¡Sé el primero en compartir algo!
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, idx) => (
            <div key={post.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
              <PostCard
                post={post}
                onPostDeleted={() => handlePostDeleted(post.id)}
                onPostUpdated={handlePostCreated}
              />
            </div>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                variant="outline"
                className="transition-all duration-300"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  'Cargar más'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 