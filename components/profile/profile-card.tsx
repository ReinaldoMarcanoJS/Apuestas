'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, ProfileWithStats } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Edit, Trophy, Target, Users, Calendar } from 'lucide-react'
import Link from 'next/link'

interface ProfileCardProps {
  profile: ProfileWithStats | Profile
  isOwnProfile?: boolean
  onEdit?: () => void
}

export function ProfileCard({ profile, isOwnProfile = false, onEdit }: ProfileCardProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUserId && profile.id !== currentUserId) {
      checkFollowStatus()
    }
    loadFollowCounts()
  }, [profile.id, currentUserId])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  const checkFollowStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .single()

    setIsFollowing(!!data)
  }

  const loadFollowCounts = async () => {
    // Followers count
    const { count: followers } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id)

    // Following count
    const { count: following } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id)

    setFollowersCount(followers || 0)
    setFollowingCount(following || 0)
  }

  const handleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser()
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name} />
              <AvatarFallback className="text-lg">
                {profile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{profile.display_name}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
              <p className="text-sm text-muted-foreground">
                Miembro desde {formatDate(profile.created_at)}
              </p>
            </div>
          </div>
          {currentUserId === profile.id ? (
            <Button onClick={onEdit} variant="outline" size="sm">
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
        {profile.bio && (
          <div>
            <h3 className="font-semibold mb-2">Biografía</h3>
            <p className="text-muted-foreground">{profile.bio}</p>
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
    </Card>
  )
} 