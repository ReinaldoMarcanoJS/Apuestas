export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          bio: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          image_url: string | null
          likes_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          image_url?: string | null
          likes_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          image_url?: string | null
          likes_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          home_team: string
          away_team: string
          league: string
          match_date: string
          status: 'upcoming' | 'live' | 'finished'
          home_score: number | null
          away_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          home_team: string
          away_team: string
          league: string
          match_date: string
          status?: 'upcoming' | 'live' | 'finished'
          home_score?: number | null
          away_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          home_team?: string
          away_team?: string
          league?: string
          match_date?: string
          status?: 'upcoming' | 'live' | 'finished'
          home_score?: number | null
          away_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      predictions: {
        Row: {
          id: string
          user_id: string
          match_id: string
          predicted_home_score: number
          predicted_away_score: number
          confidence: number
          is_correct: boolean | null
          points_earned: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          match_id: string
          predicted_home_score: number
          predicted_away_score: number
          confidence?: number
          is_correct?: boolean | null
          points_earned?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          match_id?: string
          predicted_home_score?: number
          predicted_away_score?: number
          confidence?: number
          is_correct?: boolean | null
          points_earned?: number
          created_at?: string
        }
      }
      user_stats: {
        Row: {
          id: string
          user_id: string
          total_predictions: number
          correct_predictions: number
          accuracy_percentage: number
          total_points: number
          rank_position: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_predictions?: number
          correct_predictions?: number
          accuracy_percentage?: number
          total_points?: number
          rank_position?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_predictions?: number
          correct_predictions?: number
          accuracy_percentage?: number
          total_points?: number
          rank_position?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      followers: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Prediction = Database['public']['Tables']['predictions']['Row']
export type UserStats = Database['public']['Tables']['user_stats']['Row']
export type PostLike = Database['public']['Tables']['post_likes']['Row']
export type PostComment = Database['public']['Tables']['post_comments']['Row']
export type Follower = Database['public']['Tables']['followers']['Row']

// Tipos extendidos con relaciones
export interface PostWithProfile extends Post {
  profiles: Profile
  _count?: {
    post_likes: number
    post_comments: number
  }
}

export interface ProfileWithStats extends Profile {
  user_stats: UserStats | null
  _count?: {
    posts: number
    followers: number
    following: number
  }
} 