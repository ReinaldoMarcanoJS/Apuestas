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
      <div className="flex flex-col lg:flex-row w-full min-h-screen">
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <Sidebar />
        </aside>
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    </>
  )
} 