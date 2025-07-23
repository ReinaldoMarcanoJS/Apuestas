'use client'

import { useState, useEffect, useCallback } from 'react'
import { PostWithProfile } from '@/lib/types/database'
import { getPosts, getPostsByUser } from '@/lib/supabase/posts'
import { PostCard } from './post-card'
import { CreatePost } from './create-post'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import { useRef } from 'react'
import { usePathname } from 'next/navigation'

interface PostsFeedProps {
  userId?: string // If provided, shows only posts from this user
  showCreatePost?: boolean
}

// Utilidad para timeout de promesas
function timeoutPromise<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

export function PostsFeed({ userId, showCreatePost = true }: PostsFeedProps) {
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')
  const [timeoutError, setTimeoutError] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)
  const limit = 5
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)
  // Flag de cancelación para evitar condiciones de carrera
  const cancelRequest = useRef(false)
  const pathname = usePathname()

  const loadPosts = useCallback(async (offset = 5, append = false) => {
    console.log('Llamando loadPosts, offset:', offset, 'append:', append)
    try {
      let newPosts: PostWithProfile[]
      if (userId) {
        newPosts = await timeoutPromise(getPostsByUser(userId, limit, offset), 15000)
      } else {
        newPosts = await timeoutPromise(getPosts(limit, offset), 15000)
      }
      console.log('newPosts:', newPosts)
      if (cancelRequest.current) {
        console.log('Carga cancelada, ignorando resultado')
        return
      }
      if (append) {
        setPosts(prev => [...prev, ...newPosts])
      } else {
        setPosts(newPosts)
      }
      setHasMore(newPosts.length === limit)
    } catch (error) {
      if (cancelRequest.current) {
        console.log('Error ignorado por cancelación')
        return
      }
      console.error('Error loading posts:', error)
      setError('Error al cargar las publicaciones')
    } finally {
      if (!cancelRequest.current) {
        setIsLoading(false)
        setIsLoadingMore(false)
        console.log('loadPosts terminó, isLoading:', false)
      }
    }
  }, [userId])

  useEffect(() => {
    console.log('useEffect inicial, pathname:', pathname)
    setIsLoading(true)
    setError('')
    cancelRequest.current = false
    loadPosts()
    return () => {
      // Cancelar cualquier carga pendiente al desmontar o cambiar dependencia
      cancelRequest.current = true
    }
  }, [loadPosts, pathname])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setIsLoading(true)
        setError('')
        cancelRequest.current = false
        loadPosts()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [loadPosts])

  useEffect(() => {
    if (!isLoading) {
      setTimeoutError(false)
      return
    }
    const timer = setTimeout(() => {
      if (isLoading) setTimeoutError(true)
    }, 15000)
    return () => clearTimeout(timer)
  }, [isLoading])

  // Infinite scroll observer
  const lastPostRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (isLoading || isLoadingMore) return
    if (!hasMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new window.IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setIsLoadingMore(true)
        loadPosts(posts.length, true)
      }
    }, { threshold: 1 })
    if (lastPostRef.current) {
      observer.current.observe(lastPostRef.current)
    }
    return () => { if (observer.current) observer.current.disconnect() }
  }, [posts, isLoading, isLoadingMore, hasMore, loadPosts])

  const handlePostCreated = () => {
    setIsLoading(true)
    setError('')
    cancelRequest.current = false
    loadPosts()
  }

  const handlePostDeleted = (deletedPostId: string) => {
    setDeletingPostId(deletedPostId)
    setTimeout(() => {
      setPosts(prev => prev.filter(post => post.id !== deletedPostId))
      setDeletingPostId(null)
    }, 300)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError('')
    cancelRequest.current = false
    loadPosts()
  }

  const handleRetry = () => {
    setTimeoutError(false)
    setIsLoading(true)
    setError('')
    cancelRequest.current = false
    loadPosts()
  }

  if (timeoutError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">No se pudo cargar la página</h2>
        <p className="text-muted-foreground mb-6">La carga está tardando demasiado. Por favor, verifica tu conexión o inténtalo de nuevo.</p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar nuevamente
        </Button>
      </div>
    )
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
          {posts.map((post, idx) => {
            const isLast = idx === posts.length - 1
            const isDeleting = deletingPostId === post.id
            return (
              <div
                key={post.id}
                className={`animate-fade-in-up transition-all duration-300 ${isDeleting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
                style={{ animationDelay: `${idx * 60}ms` }}
                ref={isLast ? lastPostRef : undefined}
              >
                <PostCard
                  post={post}
                  onPostDeleted={() => handlePostDeleted(post.id)}
                  onPostUpdated={handlePostCreated}
                />
              </div>
            )
          })}
          {isLoadingMore && (
            <div className="flex justify-center pt-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  )
} 
