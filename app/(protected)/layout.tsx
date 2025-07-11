import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AuthRedirect } from '@/components/auth-redirect'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  console.log(user)
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <>
      <AuthRedirect />
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-0 lg:ml-64 min-h-screen">
          {children}
        </main>
      </div>
    </>
  )
} 