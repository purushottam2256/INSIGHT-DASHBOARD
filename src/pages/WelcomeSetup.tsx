import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, ShieldCheck, CheckCircle2, LogOut } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"

export default function WelcomeSetup() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState<string>('')
  const { profile, signOut, user } = useAuth()

  // Fetch the invited email from faculty_invitations table
  useEffect(() => {
    const fetchInvitedEmail = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser?.email) {
        const { data } = await supabase
          .from('faculty_invitations')
          .select('email')
          .eq('email', authUser.email.toLowerCase())
          .single()
        if (data?.email) setInvitedEmail(data.email)
      }
    }
    fetchInvitedEmail()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      // Mark invitation as accepted
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        
        // 1. Fetch the invitation details BEFORE we update/delete it
        const { data: invite } = await supabase
          .from('faculty_invitations')
          .select('*')
          .eq('email', user.email.toLowerCase())
          .single()

        // 2. Mark the invitation as accepted
        await supabase
          .from('faculty_invitations')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('email', user.email.toLowerCase())
          .eq('status', 'pending')

        // 3. Upsert the profile explicitly! Supplying all necessary details
        if (invite) {
          await supabase
            .from('profiles')
            .upsert({ 
                id: user.id, 
                full_name: invite.full_name,
                role: invite.role,
                dept: invite.dept,
                status: 'active', 
                updated_at: new Date().toISOString() 
            })
        } else {
             await supabase
             .from('profiles')
             .update({ status: 'active', updated_at: new Date().toISOString() })
             .eq('id', user.id)
        }
      }

      setSuccess(true)

    } catch (error: any) {
      toast.error("Failed to set password: " + error.message)
      setLoading(false)
    }
  }

  const handleExit = async () => {
    await signOut()
  }

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/80 backdrop-blur-xl animate-fade-in z-10 text-center">
          <CardHeader className="pt-10 space-y-4">
            <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold tracking-tight">Account Activated!</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Your <span className="font-semibold text-foreground">Attend-Me</span> account is ready.
                <br />
                You can now log in to the <span className="font-semibold">Attend-Me</span> mobile app using your email and the password you just created.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pb-2">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/30 text-left space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Your Login Email</p>
              <p className="text-sm font-medium font-mono">{invitedEmail || user?.email || 'your registered email'}</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pb-8 pt-4">
            <Button onClick={handleExit} variant="outline" className="w-full h-11 gap-2">
              <LogOut className="h-4 w-4" />
              Close & Exit
            </Button>
            <p className="text-[10px] text-muted-foreground">You may safely close this browser tab.</p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Password Setup Form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/80 backdrop-blur-xl animate-fade-in z-10">
        <CardHeader className="text-center space-y-4 pt-8">
            <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
            <div className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">Complete Registration</CardTitle>
                <CardDescription className="text-sm">
                    Welcome, <span className="font-semibold text-foreground">{profile?.full_name || 'Faculty'}</span>!
                </CardDescription>
                <p className="text-xs text-muted-foreground mt-2">
                    Please set a secure password to activate your <span className="font-semibold">Attend-Me</span> account. You will use this password to log in to the mobile app.
                </p>
            </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    className="pl-9 h-11"
                    placeholder="Enter a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    className="pl-9 h-11"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 mt-6 text-sm gap-2" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Activate Account"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center pb-8 opacity-60">
            <p className="text-[10px] text-muted-foreground">Attend-Me Faculty Registration</p>
        </CardFooter>
      </Card>
    </div>
  )
}
