'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, ProfileWithStats } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Edit, Trophy, Target, Users, Calendar } from 'lucide-react'
import Link from 'next/link'
import { EditProfileModal } from './edit-profile-modal'
import { useUser } from '@/components/user-context'
import Image from 'next/image'

interface ProfileCardProps {
  profile: ProfileWithStats | Profile
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const { user } = useUser();
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [profileData, setProfileData] = useState(profile)
  const supabase = createClient()
  const currentUserId = user?.id || null;
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const checkFollowStatus = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .single()
    setIsFollowing(!!data)
  }, [supabase, profile.id, user])

  const loadFollowCounts = useCallback(async () => {
    // Followers count
    const { count: followers } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id)
    setFollowersCount(followers || 0)
  }, [supabase, profile.id])

  useEffect(() => {
    if (currentUserId && profile.id !== currentUserId) {
      checkFollowStatus()
    }
    loadFollowCounts()
  }, [profile.id, currentUserId, checkFollowStatus, loadFollowCounts])

  const handleFollow = async () => {
    if (!user) return
    if (isFollowing) {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowersCount(prev => prev - 1)
    } else {
      await supabase
        .from('followers')
        .insert({
          follower_id: user.id,
          following_id: profile.id
        })
      // Crear notificación de follow
      await supabase
        .from('notifications')
        .insert({
          user_id: profile.id,
          type: 'follow',
          from_user_id: user.id
        })
      setIsFollowing(true)
      setFollowersCount(prev => prev + 1)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Recargar perfil desde Supabase
  const reloadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single()
    if (data) setProfileData(data)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-20 w-20 cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                <AvatarImage src={profileData.avatar_url || ''} alt={profileData.display_name} className="object-cover" />
                <AvatarFallback className="text-lg">
                  {profileData.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {showAvatarModal && profileData.avatar_url && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowAvatarModal(false)}>
                  <div className="bg-white rounded-lg p-4 shadow-lg relative max-w-full max-h-full flex flex-col items-center">
                    <button className="absolute top-2 right-2 text-2xl font-bold text-gray-700 hover:text-black" onClick={() => setShowAvatarModal(false)}>&times;</button>
                    <Image src={profileData.avatar_url} alt={profileData.display_name} width={400} height={400} className="rounded-lg object-contain max-h-[80vh] max-w-[90vw]" />
                  </div>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profileData.display_name}</h1>
              <p className="text-muted-foreground">@{profileData.username}</p>
              <p className="text-sm text-muted-foreground">
                Miembro desde {formatDate(profileData.created_at)}
              </p>
            </div>
          </div>
          {currentUserId === profile.id ? (
            <Button onClick={() => setShowEditModal(true)} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          ) : currentUserId && (
            <Button 
              onClick={handleFollow} 
              variant={isFollowing ? "outline" : "default"}
              size="sm"
            >
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Bio */}
        {profileData.bio && (
          <div>
            <h3 className="font-semibold mb-2">Biografía</h3>
            <p className="text-muted-foreground">{profileData.bio}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Target className="h-4 w-4 mr-1" />
            </div>
            <p className="text-2xl font-bold">
              {'user_stats' in profile ? profile.user_stats?.total_predictions || 0 : 0}
            </p>
            <p className="text-sm text-muted-foreground">Predicciones</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Trophy className="h-4 w-4 mr-1" />
            </div>
            <p className="text-2xl font-bold">
              {'user_stats' in profile ? profile.user_stats?.correct_predictions || 0 : 0}
            </p>
            <p className="text-sm text-muted-foreground">Aciertos</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 mr-1" />
            </div>
            <p className="text-2xl font-bold">{followersCount}</p>
            <p className="text-sm text-muted-foreground">Seguidores</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="h-4 w-4 mr-1" />
            </div>
            <p className="text-2xl font-bold">
              {'_count' in profile ? profile._count?.posts || 0 : 0}
            </p>
            <p className="text-sm text-muted-foreground">Publicaciones</p>
          </div>
        </div>

        {/* Accuracy */}
        {'user_stats' in profile && profile.user_stats && (
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Precisión</p>
            <p className="text-3xl font-bold text-primary">
              {profile.user_stats.accuracy_percentage}%
            </p>
            <Badge variant="secondary" className="mt-2">
              {profile.user_stats.total_points} puntos
            </Badge>
          </div>
        )}

        {/* Navigation */}
        <div className="flex space-x-2">
          <Link href={`/profile/${profile.username}/posts`} className="flex-1">
            <Button variant="outline" className="w-full">
              Ver Publicaciones
            </Button>
          </Link>
          <Link href={`/profile/${profile.username}/predictions`} className="flex-1">
            <Button variant="outline" className="w-full">
              Ver Predicciones
            </Button>
          </Link>
        </div>
      </CardContent>
      {/* Modal de edición de perfil */}
      {showEditModal && (
        <EditProfileModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          profile={profileData}
          onProfileUpdated={async () => {
            setShowEditModal(false)
            await reloadProfile()
          }}
        />
      )}
    </Card>
  )
} 