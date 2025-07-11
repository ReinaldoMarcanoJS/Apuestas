'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types/database'
import { ProfileForm } from '@/components/profile/profile-form'
import { ProfileCard } from '@/components/profile/profile-card'
import { getProfile } from '@/lib/supabase/profiles'
import { useRouter } from 'next/navigation'

export default function EditProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const userProfile = await getProfile(user.id)
      if (!userProfile) {
        setIsEditing(true)
      } else {
        setProfile(userProfile)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = (updatedProfile: Profile) => {
    setProfile(updatedProfile)
    setIsEditing(false)
    router.push(`/profile/${updatedProfile.username}`)
  }

  const handleCancel = () => {
    if (profile) {
      setIsEditing(false)
    } else {
      router.push('/')
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {isEditing ? (profile ? 'Editar Perfil' : 'Crear Perfil') : 'Mi Perfil'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing 
              ? 'Personaliza tu perfil para la comunidad de apostadores'
              : 'Gestiona tu información personal y estadísticas'
            }
          </p>
        </div>

        {isEditing ? (
          <ProfileForm
            profile={profile || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <div className="space-y-6">
            <ProfileCard 
              profile={profile!} 
              isOwnProfile={true}
              onEdit={() => setIsEditing(true)}
            />
          </div>
        )}
      </div>
    </div>
  )
} 