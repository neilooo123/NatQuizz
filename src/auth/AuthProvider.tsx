import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export interface AppUser {
  id: string
  email: string
  observerName: string
}

interface AuthContextValue {
  /** L'utilisateur connecté (gardé en mémoire pour pouvoir utiliser l'appli hors ligne). */
  user: AppUser | null
  loading: boolean
  /** Mode local de développement, sans Supabase. */
  localMode: boolean
  signOut: () => Promise<void>
  setObserverName: (name: string) => Promise<void>
  startLocalMode: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const CACHE_KEY = 'natquizz.user'
const LOCAL_USER: AppUser = { id: 'local-dev', email: 'mode local', observerName: 'Moi' }

function readCachedUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as AppUser) : null
  } catch {
    return null
  }
}

function writeCachedUser(user: AppUser | null): void {
  try {
    if (user) localStorage.setItem(CACHE_KEY, JSON.stringify(user))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // Stockage indisponible (navigation privée) : tant pis pour le cache.
  }
}

function userFromSession(session: Session, previous: AppUser | null): AppUser {
  const metadataName = session.user.user_metadata?.observer_name
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    observerName:
      typeof metadataName === 'string' && metadataName
        ? metadataName
        : previous?.id === session.user.id
          ? previous.observerName
          : '',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => readCachedUser())
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const localMode = user?.id === LOCAL_USER.id

  const applyUser = useCallback((next: AppUser | null) => {
    writeCachedUser(next)
    setUser(next)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        const cached = readCachedUser()
        if (data.session) applyUser(userFromSession(data.session, cached))
        // Session expirée alors qu'internet fonctionne : il faut se reconnecter.
        // Hors ligne en revanche, on garde l'utilisateur en cache pour accéder à ses données.
        else if (!error && navigator.onLine && cached?.id !== LOCAL_USER.id) applyUser(null)
      })
      .finally(() => setLoading(false))

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) applyUser(userFromSession(session, readCachedUser()))
      else if (event === 'SIGNED_OUT') applyUser(null)
    })
    return () => data.subscription.unsubscribe()
  }, [applyUser])

  const signOut = useCallback(async () => {
    if (!localMode) await supabase.auth.signOut()
    applyUser(null)
  }, [applyUser, localMode])

  const setObserverName = useCallback(
    async (name: string) => {
      if (!user) return
      applyUser({ ...user, observerName: name })
      if (!localMode) {
        const { error } = await supabase.auth.updateUser({ data: { observer_name: name } })
        if (error) throw error
      }
    },
    [applyUser, localMode, user],
  )

  const startLocalMode = useCallback(() => applyUser(LOCAL_USER), [applyUser])

  const value = useMemo(
    () => ({ user, loading, localMode, signOut, setObserverName, startLocalMode }),
    [user, loading, localMode, signOut, setObserverName, startLocalMode],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return value
}

/** L'utilisateur connecté (à utiliser dans les pages, où il existe forcément). */
export function useUser(): AppUser {
  const { user } = useAuth()
  if (!user) throw new Error('Aucun utilisateur connecté')
  return user
}
