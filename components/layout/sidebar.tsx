'use client'

import { useState, useEffect } from 'react'
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
  Bell,
  LogOut
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Profile } from '@/lib/types/database'

import { useRouter } from 'next/navigation'
import { useUser } from '@/components/user-context'

interface SidebarProps {
  isMobileModal?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ isMobileModal = false, onMobileClose }: SidebarProps) {
  const { user, loading } = useUser();
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

  // Obtener perfil solo si hay usuario
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data))
    }
  }, [user, supabase])

  // Notificaciones solo si hay usuario
  useEffect(() => {
    if (user) {
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .then(({ count }) => setUnreadCount(count || 0))
    }
  }, [user, supabase])

  if (pathname.startsWith('/auth/')) {
    return null
  }

  if (loading || !user) {
    return null
  }

  if (!profile) {
    // Skeleton animado del sidebar
    return (
      <aside className="w-80 p-4 bg-white rounded-lg shadow space-y-4 h-full min-h-[500px] animate-fade-in">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-12 w-12 rounded-full bg-gray-300" />
          <div className="flex-1 h-5 bg-gray-300 rounded" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mt-2 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
        <div className="flex flex-col gap-2 mt-4">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </aside>
    )
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
    // Si está en modo modal móvil, cerrar el modal
    if (isMobileModal && onMobileClose) {
      onMobileClose()
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* User Profile Section */}
      <div className="p-4 border-b">
        <Link href={`/profile/${profile?.username}`} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ''} alt={profile?.display_name || user.email} className='object-cover'/>
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

      {/* Sign Out Button */}
      <Button onClick={handleSignOut} variant="outline" className="w-full mt-8 flex items-center justify-center gap-2">
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>

    </div>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      {!isMobileModal && (
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden fixed top-4 left-4 z-50"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* Mobile Sidebar */}
      {isMobileOpen && !isMobileModal && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-background border-r">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      {isMobileModal ? (
        <SidebarContent />
      ) : (
        <aside className="hidden lg:block fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 border-r bg-background">
          <SidebarContent />
        </aside>
      )}
    </>
  )
} 