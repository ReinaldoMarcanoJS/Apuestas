'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Image, Send, Loader2, X } from 'lucide-react'
import { createPost } from '@/lib/supabase/posts'

interface CreatePostProps {
  onPostCreated?: () => void
  placeholder?: string
}

export function CreatePost({ onPostCreated, placeholder = "¿Qué quieres compartir hoy?" }: CreatePostProps) {
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setError('El contenido no puede estar vacío')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const post = await createPost({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl.trim() || null
      })

      if (post) {
        setContent('')
        setImageUrl('')
        onPostCreated?.()
      } else {
        setError('Error al crear la publicación')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      setError('Error al crear la publicación')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as React.FormEvent)
    }
  }

  const isValidImageUrl = (url: string) => {
    if (!url) return true
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Image className="h-5 w-5" />
          <span>Nueva Publicación</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder={placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] resize-none"
              disabled={isLoading}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Presiona Cmd/Ctrl + Enter para publicar</span>
              <span>{content.length}/1000</span>
            </div>
          </div>

          {imageUrl && (
            <div className="space-y-2">
              <Label htmlFor="image_url">URL de la imagen</Label>
              <div className="flex space-x-2">
                <Input
                  id="image_url"
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImageUrl('')}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {!isValidImageUrl(imageUrl) && (
                <p className="text-sm text-red-500">URL de imagen inválida</p>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImageUrl(imageUrl ? '' : 'https://')}
              disabled={isLoading}
            >
              <Image className="h-4 w-4 mr-2" />
              {imageUrl ? 'Quitar imagen' : 'Agregar imagen'}
            </Button>

            <Button
              type="submit"
              disabled={isLoading || !content.trim() || (!!imageUrl && !isValidImageUrl(imageUrl))}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publicar
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 