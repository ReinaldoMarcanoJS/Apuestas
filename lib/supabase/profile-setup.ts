import { createClient } from './client'
import { ensureUserProfile } from './auth-helpers'

export async function setupUserProfile(userId: string, email: string) {
  const supabase = createClient()
  
  try {
    // Verificar si ya existe el perfil
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      console.log('Profile already exists for user:', userId)
      return existingProfile
    }

    // Crear perfil manualmente
    const profile = await ensureUserProfile(userId, email)
    console.log('Profile created successfully for user:', userId)
    return profile

  } catch (error) {
    console.error('Error setting up user profile:', error)
    throw error
  }
}

export async function checkAndFixUserProfiles() {
  const supabase = createClient()
  
  try {
    // Obtener usuarios sin perfiles
    const { data: usersWithoutProfiles } = await supabase
      .from('auth.users')
      .select('id, email')
      .not('id', 'in', `(select id from profiles)`)

    if (usersWithoutProfiles && usersWithoutProfiles.length > 0) {
      console.log('Found users without profiles:', usersWithoutProfiles.length)
      
      for (const user of usersWithoutProfiles) {
        try {
          await setupUserProfile(user.id, user.email)
        } catch (error) {
          console.error(`Failed to setup profile for user ${user.id}:`, error)
        }
      }
    }

    return true
  } catch (error) {
    console.error('Error checking user profiles:', error)
    return false
  }
} 