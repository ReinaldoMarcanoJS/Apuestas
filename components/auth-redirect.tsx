'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { ensureUserProfile } from '@/lib/supabase/auth-helpers'

export function AuthRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthChange = async (event: string, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          // Asegurar que el usuario tenga perfil
          await ensureUserProfile(session.user.id, session.user.email)
          // Redirigir al feed si está en una página de auth
          if (pathname.startsWith('/auth/')) {
            router.push('/feed')
          }
        } catch (error) {
          console.error('Error ensuring user profile:', error)
          // Si hay error, intentar redirigir de todas formas
          if (pathname.startsWith('/auth/')) {
            router.push('/feed')
          }
        }
      } else if (event === 'SIGNED_OUT') {
        router.push('/auth/login')
      }
    }

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)

    return () => subscription.unsubscribe()
  }, [router, supabase, pathname])

  return null
} 