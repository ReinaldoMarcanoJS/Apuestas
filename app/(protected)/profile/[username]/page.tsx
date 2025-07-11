import { redirect } from "next/navigation";
import { getProfileWithStats } from '@/lib/supabase/profiles'
import { ProfileCard } from '@/components/profile/profile-card'
import { PostsFeed } from '@/components/posts/posts-feed'
import { PopularMatches } from "@/components/layout/popular-matches";

interface ProfilePageProps {
  params: {
    username: string
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  // Si no hay username, redirige a login
  if (!params?.username) {
    redirect("/auth/login");
  }

  const profile = await getProfileWithStats(params.username);

  // Si no existe el perfil, redirige a feed
  if (!profile) {
    redirect("/auth/feed");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto flex justify-between gap-6">
       <div className="w-full">
       <div className="mb-8">
          <ProfileCard profile={profile} />
        </div>
        
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Publicaciones de @{profile.username}</h2>
          <PostsFeed userId={profile.id} showCreatePost={false} />
        </div>
       </div>

           {/* Panel derecho solo en desktop */}
      <div className="hidden lg:block w-80 flex-shrink-0 left-00">
        <PopularMatches />
      </div>
      </div>
    </div>
  )
} 