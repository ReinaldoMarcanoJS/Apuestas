import { createClient } from './client'
import { Post, PostWithProfile } from '../types/database'

export async function getPosts(limit = 20, offset = 0): Promise<PostWithProfile[]> {
  const supabase = createClient()
  
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }

  if (!posts) return []

  // Obtener perfiles y conteos para cada post
  const postsWithProfiles: PostWithProfile[] = await Promise.all(
    posts.map(async (post) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', post.user_id)
        .single()

      const { count: likesCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)

      const { count: commentsCount } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)

      return {
        ...post,
        profiles: profile || {
          id: post.user_id,
          username: 'usuario',
          display_name: 'Usuario',
          bio: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        _count: {
          post_likes: likesCount || 0,
          post_comments: commentsCount || 0
        }
      }
    })
  )

  return postsWithProfiles
}

export async function getPostsByUser(userId: string, limit = 20, offset = 0): Promise<PostWithProfile[]> {
  const supabase = createClient()
  
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching user posts:', error)
    return []
  }

  if (!posts) return []

  // Obtener perfiles y conteos para cada post
  const postsWithProfiles: PostWithProfile[] = await Promise.all(
    posts.map(async (post) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', post.user_id)
        .single()

      const { count: likesCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)

      const { count: commentsCount } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)

      return {
        ...post,
        profiles: profile || {
          id: post.user_id,
          username: 'usuario',
          display_name: 'Usuario',
          bio: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        _count: {
          post_likes: likesCount || 0,
          post_comments: commentsCount || 0
        }
      }
    })
  )

  return postsWithProfiles
}

export async function createPost(post: Omit<Post, 'id' | 'likes_count' | 'created_at' | 'updated_at'>): Promise<Post | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('posts')
    .insert(post)
    .select()
    .single()

  if (error) {
    console.error('Error creating post:', error)
    return null
  }

  return data
}

export async function updatePost(postId: string, updates: Partial<Post>): Promise<Post | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', postId)
    .select()
    .single()

  if (error) {
    console.error('Error updating post:', error)
    return null
  }

  return data
}

export async function deletePost(postId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) {
    console.error('Error deleting post:', error)
    return false
  }

  return true
}

export async function getPost(postId: string): Promise<PostWithProfile | null> {
  const supabase = createClient()
  
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (error || !post) {
    console.error('Error fetching post:', error)
    return null
  }

  // Obtener perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', post.user_id)
    .single()

  // Obtener conteos
  const { count: likesCount } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', post.id)

  const { count: commentsCount } = await supabase
    .from('post_comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', post.id)

  return {
    ...post,
    profiles: profile || {
      id: post.user_id,
      username: 'usuario',
      display_name: 'Usuario',
      bio: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    _count: {
      post_likes: likesCount || 0,
      post_comments: commentsCount || 0
    }
  }
}

export async function likePost(postId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('post_likes')
    .insert({ post_id: postId, user_id: userId })

  // Crear notificación de like
  // Obtener el post para saber el user_id del dueño
  const { data: post } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .single()
  if (post && post.user_id !== userId) {
    await supabase
      .from('notifications')
      .insert({
        user_id: post.user_id,
        type: 'like',
        from_user_id: userId,
        post_id: postId
      })
  }

  if (error) {
    console.error('Error liking post:', error)
    return false
  }

  return true
}

export async function unlikePost(postId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error unliking post:', error)
    return false
  }

  return true
}

export async function isPostLiked(postId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    return false
  }

  if (error) {
    console.error('Error checking if post is liked:', error)
    return false
  }

  return !!data
} 