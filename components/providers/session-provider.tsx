'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { getUserType, type UserType } from '@/lib/supabase/types'

type Session = {
  user: User & { type: UserType }
} | null

type SessionContextType = {
  session: Session
  isLoading: boolean
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  isLoading: true,
})

type Props = {
  children: React.ReactNode
}

export function SessionProvider(props: Props) {
  const supabase = createClient()
  const [session, setSession] = useState<Session>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setSession({
          user: {
            ...data.user,
            type: getUserType(data.user.email),
          },
        })
      }
      setIsLoading(false)
    }

    fetchSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, supabaseSession) => {
        if (supabaseSession?.user) {
          setSession({
            user: {
              ...supabaseSession.user,
              type: getUserType(supabaseSession.user.email),
            },
          })
        } else {
          setSession(null)
        }
        setIsLoading(false)
      },
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  return (
    <SessionContext.Provider value={{ session, isLoading }}>
      {props.children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  return {
    data: context.session,
    status: context.isLoading
      ? 'loading'
      : context.session
        ? 'authenticated'
        : 'unauthenticated',
  }
}
