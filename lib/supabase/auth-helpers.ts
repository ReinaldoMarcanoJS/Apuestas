import { createClient } from './client'
import { createProfile, getProfile } from './profiles'

export async function ensureUserProfile(userId: string, email: string) {
  
  // Verificar si el usuario ya tiene perfil
  const existingProfile = await getProfile(userId)
  
  if (!existingProfile) {
    // Crear perfil automáticamente
    const username = email.split('@')[0]
    const displayName = email.split('@')[0]
    
    const newProfile = await createProfile({
      id: userId,
      username,
      display_name: displayName,
      bio: null,
      avatar_url: null
    })
    
    return newProfile
  }
  
  return existingProfile
}

export async function getCurrentUser() {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export async function getCurrentUserWithProfile() {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }
  
  const profile = await getProfile(user.id)
  
  return {
    user,
    profile
  }
} 