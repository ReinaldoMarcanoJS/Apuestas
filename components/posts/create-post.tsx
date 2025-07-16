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
import { useRef } from 'react'

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
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])

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
        image_urls: imageUrls
      })

      if (post) {
        setContent('')
        setImageUrls([])
        setPreviews([])
        if (fileInputRef.current) fileInputRef.current.value = ''
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

  // Nueva función para subir varias imágenes a Supabase Storage
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (files.length + imageUrls.length > 4) {
      setError('Solo puedes subir hasta 4 imágenes')
      return
    }
    setUploading(true)
    setError('')
    const newUrls: string[] = []
    const newPreviews: string[] = []
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')
      for (const file of files) {
        // Previsualización local
        newPreviews.push(URL.createObjectURL(file))
        // Subida
        const fileExt = file.name.split('.').pop()
        const filePath = `publicaciones/${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('publicaciones').upload(filePath, file)
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('publicaciones').getPublicUrl(filePath)
        newUrls.push(publicUrlData.publicUrl)
      }
      setImageUrls(prev => [...prev, ...newUrls])
      setPreviews(prev => [...prev, ...newPreviews])
    } catch (error) {
      setError('Error al subir las imágenes')
      console.log(error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Eliminar una imagen antes de publicar (recibe índice)
  const handleRemoveImage = (idx: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Previsualización para URL manual
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value)
    setPreviewUrl(e.target.value)
  }

  // Nueva función para validar si se puede publicar
  const canPublish =
    (!isLoading &&
      (
        content.trim().length > 0 ||
        imageUrls.length > 0
      )
    );

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
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Presiona Cmd/Ctrl + Enter para publicar</span>
              <span>{content.length}/1000</span>
            </div>
          </div>

          {/* Previsualización de imágenes */}
          {previews.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {previews.map((url, idx) => (
                <div key={idx} className="relative group">
                  <img src={url} alt={`preview-${idx}`} className="max-h-32 rounded border bg-white object-contain" style={{ maxWidth: '120px' }} />
                  <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-red-500 hover:bg-opacity-100 transition-opacity">
                    <span className="sr-only">Quitar</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}


          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-2 items-center justify-between">
           <div className='flex gap-2'>
           <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploading || imageUrls.length >= 4}
            >
              <Image className="h-4 w-4 mr-2" />
              {imageUrls.length >= 4 ? 'Máx. 4 imágenes' : 'Subir imágenes'}
            </Button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={isLoading || uploading || imageUrls.length >= 4}
              multiple
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRemoveImage(0)}
              disabled={isLoading || uploading || (!imageUrl && !previewUrl)}
            >
              <Image className="h-4 w-4 mr-2" />
              Quitar imagen
            </Button>
           </div>
            {uploading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            <Button
            type="submit"
            disabled={!canPublish}
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