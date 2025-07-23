'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from '@supabase/supabase-js'
import { usePathname } from 'next/navigation'

interface UserContextType {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    console.log('UserProvider: llamando getUser')
    supabase.auth.getUser()
      .then(({ data }) => {
        console.log('UserProvider: Usuario obtenido:', data.user);
        setUser(data.user);
      })
      .catch((err) => {
        console.error('UserProvider: Error obteniendo usuario:', err);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
        console.log('UserProvider: loading = false')
      });
  }, [pathname]);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser debe usarse dentro de un UserProvider");
  }
  return context;
} 