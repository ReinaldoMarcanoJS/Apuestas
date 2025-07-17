'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Home, 
  Trophy, 
  Users, 
  Calendar, 
  TrendingUp, 
  Settings,
  Menu,
  X,
  Loader2,
  Bell
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Profile } from '@/lib/types/database'
import { PopularMatches } from './popular-matches'
import { useRouter } from 'next/navigation'

export function Sidebar() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [loadingHref, setLoadingHref] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Todos los hooks deben ir antes de cualquier return condicional
  useEffect(() => {
    if (loadingHref && pathname === loadingHref) {
      setLoadingHref(null);
    }
  }, [pathname, loadingHref]);

  const getCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profile)
        console.log(profile)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    }
  }, [supabase])

  const fetchUnreadNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setUnreadCount(count || 0)
  }, [supabase])

  useEffect(() => {
    getCurrentUser()
    fetchUnreadNotifications()
  }, [getCurrentUser, fetchUnreadNotifications])

  // Ahora los returns condicionales
  if (pathname.startsWith('/auth/')) {
    return null
  }

  if (!user) {
    return null
  }


  const navigationItems = [
    {
      name: 'Inicio',
      href: '/feed',
      icon: Home,
      badge: null
    },
    {
      name: 'Mi Perfil',
      href: `/profile/${profile?.username}`,
      icon: Users,
      badge: null
    },
    {
      name: 'Predicciones',
      href: '/predictions',
      icon: Trophy,
      badge: 'Nuevo'
    },
    {
      name: 'Partidos',
      href: '/matches',
      icon: Calendar,
      badge: null
    },
    {
      name: 'Rankings',
      href: '/rankings',
      icon: TrendingUp,
      badge: null
    },
    {
      name: 'Configuración',
      href: '/settings',
      icon: Settings,
      badge: null
    },
    {
      name: 'Notificaciones',
      href: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null
    }
  ]

  const handleNavigation = (href: string) => {
    setLoadingHref(href)
    router.push(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* User Profile Section */}
      <div className="p-4 border-b">
        <Link href={`/profile/${profile?.username}`} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ''} alt={profile?.display_name || user.email} />
            <AvatarFallback>
              {profile?.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.display_name || 'Usuario'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              @{profile?.username || 'usuario'}
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Button
              key={item.name}
              variant={isActive ? "default" : "ghost"}
              className="w-full justify-start h-12 transition-all duration-200"
              onClick={() => {
                setIsMobileOpen(false)
                handleNavigation(item.href)
              }}
              disabled={!!loadingHref}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span className="flex-1 text-left">
                {loadingHref === item.href ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                  </span>
                ) : (
                  item.name
                )}
              </span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Button>
          )
        })}
      </nav>

      {/* Quick Stats */}
      <div className="p-4 border-t">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Predicciones</span>
            <span className="font-medium">0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Aciertos</span>
            <span className="font-medium">0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Puntos</span>
            <span className="font-medium">0</span>
          </div>
        </div>
      </div>

      {/* Partidos populares y encuestas solo en mobile */}
      <div className="block lg:hidden p-4 border-t">
        <PopularMatches />
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-background border-r">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 border-r bg-background">
        <SidebarContent />
      </aside>
    </>
  )
} 