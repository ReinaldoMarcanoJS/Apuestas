'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Settings, LogOut, User, Menu, X } from 'lucide-react'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types/database'
import { Sidebar } from './sidebar'
import { createPortal } from 'react-dom'
import { Notification } from '@/lib/types/database'
import { useUser } from '@/components/user-context'

export function Header() {
  const { user, loading } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null)
  const [, setUnreadNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setUnreadNotifications(data || [])
          setUnreadCount(data ? data.length : 0)
        })
    }
  }, [user, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
            <span className="font-bold">SocialBet</span>
          </div>
        </div>
      </header>
    )
  }

  if (!user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="font-bold text-xl">
              SocialBet
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/auth/login">
              <Button variant="outline">Iniciar Sesión</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 flex h-14 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            {/* Botón menú móvil */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden mr-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <Link href="/" className="font-bold text-xl">
              SocialBet
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden sm:flex flex-1 max-w-md mx-2 lg:mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios, partidos..."
                className="pl-10"
              />
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={() => router.push('/notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
 
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.display_name || user.email} />
                    <AvatarFallback>
                      {profile?.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.display_name || 'Usuario'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      @{profile?.username || 'usuario'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${profile?.username}`} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Mi Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/edit" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Modal Sidebar móvil - fuera del header para cubrir toda la ventana */}
      {sidebarOpen && typeof window !== 'undefined' && createPortal(
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-background border-r shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-bold text-lg">Menú</span>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            {/* Sidebar real aquí */}
            <div className="overflow-y-auto h-[calc(100vh-4rem)]">
              <Sidebar isMobileModal={true} onMobileClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
} 