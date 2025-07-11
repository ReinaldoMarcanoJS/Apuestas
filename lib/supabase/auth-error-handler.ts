import { AuthError } from '@supabase/supabase-js'

export function handleAuthError(error: AuthError): string {
  switch (error.message) {
    case 'Database error saving new user':
      return 'Error al crear el perfil. Por favor, intenta de nuevo.'
    
    case 'User already registered':
      return 'Este email ya está registrado. Intenta iniciar sesión.'
    
    case 'Invalid login credentials':
      return 'Email o contraseña incorrectos.'
    
    case 'Email not confirmed':
      return 'Por favor, confirma tu email antes de iniciar sesión.'
    
    case 'Password should be at least 6 characters':
      return 'La contraseña debe tener al menos 6 caracteres.'
    
    case 'Unable to validate email address: invalid format':
      return 'Formato de email inválido.'
    
    default:
      console.error('Auth error:', error)
      return 'Ocurrió un error inesperado. Por favor, intenta de nuevo.'
  }
}

export function isProfileCreationError(error: AuthError): boolean {
  return error.message === 'Database error saving new user'
} 