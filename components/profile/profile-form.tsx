'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Check, X, Loader2 } from 'lucide-react'
import { checkUsernameAvailability } from '@/lib/supabase/profiles'

interface ProfileFormProps {
  profile?: Profile
  onSave: (profile: Profile) => void
  onCancel: () => void
}

export function ProfileForm({ profile, onSave, onCancel }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    if (formData.username && formData.username !== profile?.username) {
      checkUsername()
    }
  }, [formData.username])

  const checkUsername = async () => {
    if (formData.username.length < 3) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    
    try {
      const isAvailable = await checkUsernameAvailability(formData.username)
      setUsernameStatus(isAvailable ? 'available' : 'taken')
    } catch (error) {
      setUsernameStatus('idle')
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido'
    } else if (formData.username.length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres'
    } else if (usernameStatus === 'taken') {
      newErrors.username = 'Este nombre de usuario ya está en uso'
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'El nombre de display es requerido'
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'La biografía no puede tener más de 500 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const profileData = {
        id: user.id,
        ...formData
      }

      if (profile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id)
          .select()
          .single()

        if (error) throw error
        onSave(data)
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single()

        if (error) throw error
        onSave(data)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setErrors({ general: 'Error al guardar el perfil' })
    } finally {
      setIsLoading(false)
    }
  }

  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'available':
        return <Check className="h-4 w-4 text-green-500" />
      case 'taken':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getUsernameStatusText = () => {
    switch (usernameStatus) {
      case 'checking':
        return 'Verificando...'
      case 'available':
        return 'Disponible'
      case 'taken':
        return 'No disponible'
      default:
        return ''
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{profile ? 'Editar Perfil' : 'Crear Perfil'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Preview */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={formData.avatar_url || ''} />
              <AvatarFallback>
                {formData.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar_url">URL del Avatar</Label>
              <Input
                id="avatar_url"
                type="url"
                placeholder="https://ejemplo.com/avatar.jpg"
                value={formData.avatar_url}
                onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Nombre de Usuario *</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                placeholder="usuario123"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                className={errors.username ? 'border-red-500' : ''}
              />
              {usernameStatus !== 'idle' && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  {getUsernameStatusIcon()}
                  <span className="text-sm text-muted-foreground">
                    {getUsernameStatusText()}
                  </span>
                </div>
              )}
            </div>
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Solo letras, números y guiones bajos. Mínimo 3 caracteres.
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display_name">Nombre de Display *</Label>
            <Input
              id="display_name"
              type="text"
              placeholder="Tu Nombre"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              className={errors.display_name ? 'border-red-500' : ''}
            />
            {errors.display_name && (
              <p className="text-sm text-red-500">{errors.display_name}</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Biografía</Label>
            <Textarea
              id="bio"
              placeholder="Cuéntanos sobre ti y tus predicciones..."
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              className={errors.bio ? 'border-red-500' : ''}
              rows={4}
            />
            {errors.bio && (
              <p className="text-sm text-red-500">{errors.bio}</p>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Opcional</span>
              <span>{formData.bio.length}/500</span>
            </div>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || usernameStatus === 'taken' || usernameStatus === 'checking'}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Perfil'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 