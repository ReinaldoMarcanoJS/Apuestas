"use client"
import { redirect, useSearchParams } from "next/navigation";
import { getProfileWithStats } from '@/lib/supabase/profiles'
import { ProfileWithStats } from '@/lib/types/database'
import { ProfileCard } from '@/components/profile/profile-card'
import { PostsFeed } from '@/components/posts/posts-feed'
import { PopularMatches } from "@/components/layout/popular-matches";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";


export default function ProfilePage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<ProfileWithStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!username) {
      console.log(username);
      redirect("/auth/login");
      return;
    }
    async function fetchProfile() {
      const prof = await getProfileWithStats(username as string);
      if (!prof) {
        redirect("/auth/feed");
        return;
      }
      setProfile(prof);
      setLoading(false);
    }
    fetchProfile();
  }, [searchParams]);

  if (loading || !profile) {
    return <div className="container mx-auto px-4 py-8">Cargando perfil...</div>;
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