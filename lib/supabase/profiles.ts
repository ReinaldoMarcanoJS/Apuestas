import { createClient } from './client'
import { Profile, ProfileWithStats } from '../types/database'

function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export async function getProfileWithStats(userIdOrUsername: string): Promise<ProfileWithStats | null> {
  const supabase = createClient()
  let profileQuery

  if (isUUID(userIdOrUsername)) {
    profileQuery = supabase
      .from('profiles')
      .select('*')
      .eq('id', userIdOrUsername)
      .single()
  } else {
    profileQuery = supabase
      .from('profiles')
      .select('*')
      .eq('username', userIdOrUsername)
      .single()
  }

  const { data: profile, error: profileError } = await profileQuery

  if (profileError || !profile) {
    console.error('Error fetching profile:', profileError)
    return null
  }

  // Obtener estadísticas
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', profile.id)
    .single()

  // Obtener conteos
  const { count: postsCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)

  const { count: followersCount } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile.id)

  const { count: followingCount } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profile.id)

  // Construir el objeto con estadísticas
  const profileWithStats: ProfileWithStats = {
    ...profile,
    user_stats: stats,
    _count: {
      posts: postsCount || 0,
      followers: followersCount || 0,
      following: followingCount || 0
    }
  }

  return profileWithStats
}

export async function createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    return null
  }

  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return null
  }

  return data
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (error) {
    console.error('Error fetching profile by username:', error)
    return null
  }

  return data
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(10)

  if (error) {
    console.error('Error searching profiles:', error)
    return []
  }

  return data || []
}

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (error && error.code === 'PGRST116') {
    // No rows returned, username is available
    return true
  }

  if (error) {
    console.error('Error checking username:', error)
    return false
  }

  // Username already exists
  return false
} 