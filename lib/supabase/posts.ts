import { createClient } from './client'
import { Post, PostWithProfile, PostComment, Profile } from '../types/database'

export async function getPosts(limit = 20, offset = 0): Promise<PostWithProfile[]> {
  const supabase = createClient()
  
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, profiles(*), post_likes(id), post_comments(id)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }

  if (!posts) return []

  const postsWithProfiles: PostWithProfile[] = (posts as any[]).map((post) => ({
    ...post,
    profiles: post.profiles || {
      id: post.user_id,
      username: 'usuario',
      display_name: 'Usuario',
      bio: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    _count: {
      post_likes: (post as any).post_likes ? (post as any).post_likes.length : 0,
      post_comments: (post as any).post_comments ? (post as any).post_comments.length : 0
    }
  }))

  return postsWithProfiles
}

export async function getPostsByUser(userId: string, limit = 20, offset = 0): Promise<PostWithProfile[]> {
  const supabase = createClient()
  
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, profiles(*), post_likes(id), post_comments(id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching user posts:', error)
    return []
  }

  if (!posts) return []

  const postsWithProfiles: PostWithProfile[] = (posts as any[]).map((post) => ({
    ...post,
    profiles: post.profiles || {
      id: post.user_id,
      username: 'usuario',
      display_name: 'Usuario',
      bio: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    _count: {
      post_likes: (post as any).post_likes ? (post as any).post_likes.length : 0,
      post_comments: (post as any).post_comments ? (post as any).post_comments.length : 0
    }
  }))

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
    .select('*, profiles(*), post_likes(id), post_comments(id)')
    .eq('id', postId)
    .single()

  if (error || !post) {
    console.error('Error fetching post:', error)
    return null
  }

  return {
    ...post,
    profiles: post.profiles || {
      id: post.user_id,
      username: 'usuario',
      display_name: 'Usuario',
      bio: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    _count: {
      post_likes: post.post_likes ? post.post_likes.length : 0,
      post_comments: post.post_comments ? post.post_comments.length : 0
    }
  }
}

// Esta función ahora retorna un objeto con éxito y la cantidad actualizada de likes.
// Explicación en español: Ahora, después de insertar el like, se hace una consulta para contar los likes actuales del post y se retorna ese número junto con el resultado de éxito.

export async function likePost(post: PostWithProfile, userId: string): Promise<{ success: boolean, likesCount: number }> {
  const supabase = createClient()
  let likesCount = 0

  // Insertar el like
  const { error } = await supabase
    .from('post_likes')
    .insert({ post_id: post.id, user_id: userId })

  // Crear notificación de like
  // Usar el user_id del post recibido
  if (post && post.user_id !== userId) {
    await supabase
      .from('notifications')
      .insert({
        user_id: post.user_id,
        type: 'like',
        from_user_id: userId,
        post_id: post.id
      })
  }

  // Obtener la cantidad actualizada de likes para el post
  const { count, error: countError } = await supabase
    .from('post_likes')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', post.id)

  if (!countError && typeof count === 'number') {
    likesCount = count
  } else {
    likesCount = 0
  }

  if (error) {
    console.error('Error al dar like al post:', error)
    return { success: false, likesCount }
  }
  console.log( "likesCount",likesCount);
  return { success: true, likesCount }
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

// Obtener comentarios de un post
export async function getPostComments(postId: string): Promise<Array<{ id: string; content: string; created_at: string; user: { username: string; display_name: string; avatar_url: string | null } }>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, content, created_at, user: user_id (username, display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Error fetching comments:', error)
    return []
  }
  return (data || []).map((c: any) => {
    const user = Array.isArray(c.user) ? c.user[0] : c.user;
    return {
      ...c,
      user: {
        username: user?.username,
        display_name: user?.display_name || user?.username,
        avatar_url: user?.avatar_url
      }
    }
  })
}

// Agregar un comentario a un post
export async function addPostComment(postId: string, userId: string, content: string): Promise<{ id: string; content: string; created_at: string; user: { username: string; display_name: string; avatar_url: string | null } } | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, content })
    .select('id, content, created_at, user: user_id (username, display_name, avatar_url)')
    .single()
  if (error) {
    console.error('Error adding comment:', error)
    return null
  }
  return {
    ...data,
    user: (() => {
      const user = Array.isArray(data.user) ? data.user[0] : data.user;
      return {
        username: user?.username,
        display_name: user?.display_name || user?.username,
        avatar_url: user?.avatar_url
      }
    })()
  }
} 

// Obtener usuarios que dieron like a un post
export async function getPostLikes(postId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_likes')
    .select('id, user: user_id (username, display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Error fetching post likes:', error)
    return []
  }
  return (data || []).map((c: any) => {
    const user = Array.isArray(c.user) ? c.user[0] : c.user;
    return {
      ...c,
      user: {
        username: user?.username,
        display_name: user?.display_name || user?.username,
        avatar_url: user?.avatar_url
      }
    }
  })
} 

// Dar like a un comentario
export async function likeComment(commentId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('comment_likes')
    .insert({ comment_id: commentId, user_id: userId })
  if (error) {
    console.error('Error liking comment:', error)
    return false
  }
  return true
}

// Quitar like a un comentario
export async function unlikeComment(commentId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('comment_likes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId)
  if (error) {
    console.error('Error unliking comment:', error)
    return false
  }
  return true
}

// Saber si el usuario ya le dio like a un comentario
export async function isCommentLiked(commentId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .single()
  if (error && error.code === 'PGRST116') {
    return false
  }
  if (error) {
    console.error('Error checking comment like:', error)
    return false
  }
  return !!data
}

// Obtener el número de likes de un comentario
export async function getCommentLikesCount(commentId: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('comment_likes')
    .select('id', { count: 'exact', head: true })
    .eq('comment_id', commentId)
  if (error) {
    console.error('Error counting comment likes:', error)
    return 0
  }
  return count || 0
}

// Obtener sub-comentarios (respuestas) de un comentario
export async function getCommentReplies(commentId: string): Promise<Array<{ id: string; content: string; created_at: string; user: { username: string; display_name: string; avatar_url: string | null }, parent_comment_id: string | null }>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, content, created_at, user: user_id (username, display_name, avatar_url), parent_comment_id')
    .eq('parent_comment_id', commentId)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Error fetching comment replies:', error)
    return []
  }
  return (data || []).map((c: any) => {
    const user = Array.isArray(c.user) ? c.user[0] : c.user;
    return {
      ...c,
      user: {
        username: user?.username,
        display_name: user?.display_name || user?.username,
        avatar_url: user?.avatar_url
      }
    }
  })
}

// Agregar una respuesta a un comentario
export async function addCommentReply(parentCommentId: string, postId: string, userId: string, content: string): Promise<{ id: string; content: string; created_at: string; user: { username: string; display_name: string; avatar_url: string | null }, parent_comment_id: string | null } | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ parent_comment_id: parentCommentId, post_id: postId, user_id: userId, content })
    .select('id, content, created_at, user: user_id (username, display_name, avatar_url), parent_comment_id')
    .single()
  if (error) {
    console.error('Error adding comment reply:', error)
    return null
  }
  return {
    ...data,
    user: (() => {
      const user = Array.isArray(data.user) ? data.user[0] : data.user;
      return {
        username: user?.username,
        display_name: user?.display_name || user?.username,
        avatar_url: user?.avatar_url
      }
    })(),
  }
} 