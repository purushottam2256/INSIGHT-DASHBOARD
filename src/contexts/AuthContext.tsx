import { createContext, useContext, useEffect, useState } from "react"
import { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type UserRole = "faculty" | "class_incharge" | "lab_incharge" | "management" | "hod" | "principal" | "developer"

interface AuthContextType {
  session: Session | null
  user: User | null
  role: UserRole | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user.id)
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchRole = async (userId: string) => {
    try {
      // 1. Check Admins Table First (Priority)
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("role")
        .eq("id", userId)
        .single()

      if (!adminError && adminData) {
        setRole(adminData.role as UserRole)
        return
      }

      // 2. Fallback to Profiles (Faculty/Staff)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      if (profileError) {
        console.error("Error fetching user role:", profileError)
      } else {
        setRole(profileData.role as UserRole)
      }
    } catch (err) {
      console.error("Unexpected error fetching role:", err)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setRole(null)
    setSession(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
