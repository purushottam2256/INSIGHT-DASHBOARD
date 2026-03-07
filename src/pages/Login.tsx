import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModeToggle } from "@/components/mode-toggle"
import { Loader2, CheckCircle2 } from "lucide-react"
import logo from "@/assets/logo.png"

import ZenBackground from "@/components/ZenBackground"

export function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError
      setSuccessMsg("Access Granted")
      await new Promise(r => setTimeout(r, 800))
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message || "Invalid credentials")
    } finally {
      if (!successMsg) setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    if (!email) {
        setError("Please enter your email address.")
        setLoading(false)
        return
    }

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
             redirectTo: window.location.origin + '/reset-password',
        })
        if (error) throw error
        setSuccessMsg("Password reset link sent.")
    } catch (err: any) {
        setError(err.message || "Failed to send reset email")
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <ZenBackground />

      {/* Main Card */}
      <div className="w-full max-w-[1100px] h-auto lg:h-[650px] bg-card/90 dark:bg-card/80 backdrop-blur-2xl rounded-[32px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] border border-border/50 dark:border-border/30 z-10 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Side (Brand) - 45% width */}
        <div className="w-full lg:w-[45%] bg-gradient-to-br from-[hsl(28,90%,52%)] via-[hsl(25,88%,45%)] to-[hsl(22,85%,38%)] dark:from-[hsl(30,80%,35%)] dark:via-[hsl(25,75%,28%)] dark:to-[hsl(20,70%,20%)] p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden text-white">
            {/* Texture Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay" />
            
            {/* Decorative Gradient Overlay */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-transparent to-black/20" />

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-[72px] w-[72px] bg-white/10 backdrop-blur-md rounded-2xl shadow-inner border border-white/20 flex items-center justify-center p-2">
                         <img src={logo} alt="Logo" className="w-12 h-12 object-contain drop-shadow-md rounded-xl overflow-hidden" />
                    </div>
                    <span className="font-bold text-2xl tracking-tight text-white drop-shadow-sm">Insight</span>
                </div>
                
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1] mb-6 drop-shadow-lg">
                  Empowering<br/>Academic<br/>Excellence.
                </h1>
                <p className="text-white/80 text-sm lg:text-base max-w-[90%] leading-relaxed font-medium drop-shadow-md">
                   Experience the next generation of campus management with real-time analytics and seamless automation.
                </p>
            </div>

            {/* Floating UI Elements */}
            <div className="relative z-10 mt-12 lg:mt-0 h-48 w-full">
                 {/* Card 1: Attendance Stats */}
                 <div className="absolute top-0 right-4 w-48 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl transform rotate-[-6deg] hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center text-green-300">
                             <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-white/60">Attendance</p>
                            <p className="text-sm font-bold text-white">98.5%</p>
                        </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="w-[98%] h-full bg-green-400 rounded-full" />
                    </div>
                 </div>

                 {/* Card 2: Active Faculty */}
                 <div className="absolute bottom-4 left-0 w-56 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl transform rotate-[3deg] hover:rotate-0 transition-transform duration-500 translate-x-4">
                    <div className="flex items-center justify-between mb-2">
                         <span className="text-xs font-medium text-white/80">Active Faculty</span>
                         <span className="text-xs bg-white/15 text-white/90 px-2 py-0.5 rounded-full border border-white/10">Now</span>
                    </div>
                     <div className="flex -space-x-2">
                        {[1,2,3,4].map((i) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white/20 bg-white/15 flex items-center justify-center text-[10px] text-white">
                                {String.fromCharCode(64+i)}
                            </div>
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-white/20 bg-white/25 flex items-center justify-center text-[10px] font-bold text-white">
                            +12
                        </div>
                    </div>
                 </div>
            </div>
        </div>

        {/* Right Side (Form) - 55% width */}
        <div className="w-full lg:w-[55%] p-8 lg:p-16 flex flex-col justify-center bg-card dark:bg-card relative">
             <div className="absolute top-6 right-6">
                <ModeToggle />
             </div>

             <div className="mb-10">
                 <h2 className="text-3xl font-bold text-foreground mb-2">Hello Again!</h2>
                 <p className="text-muted-foreground text-sm">Welcome back you've been missed!</p>
             </div>

             {/* Error/Success Messages */}
             {error && (
                <div className="mb-6 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-lg flex items-center gap-2 border border-red-200/50 dark:border-red-800/30">
                    <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    {error}
                </div>
             )}
             {successMsg && (
                <div className="mb-6 p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 rounded-lg flex items-center gap-2 border border-green-200/50 dark:border-green-800/30">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {successMsg}
                </div>
             )}

             {isLogin ? (
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                            id="email"
                            type="email" 
                            placeholder="faculty@mrce.in"
                            className="h-12 bg-secondary/50 dark:bg-secondary/30 border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all rounded-xl" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                            id="password"
                            type="password" 
                            placeholder="••••••••"
                            className="h-12 bg-secondary/50 dark:bg-secondary/30 border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all rounded-xl"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                         <div className="flex items-center gap-2">
                             <input type="checkbox" id="remember" className="rounded border-border text-primary focus:ring-primary/30 bg-secondary" />
                             <label htmlFor="remember" className="text-muted-foreground">Remember me</label>
                         </div>
                         <button 
                            type="button" 
                            onClick={() => { setIsLogin(false); setError(null); }}
                            className="text-primary font-medium hover:text-primary/80 transition-colors"
                        >
                             Forgot Password?
                         </button>
                    </div>

                    <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-xl text-base font-medium transition-all active:scale-[0.98]" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Login"}
                    </Button>
                </form>
             ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                     <div className="space-y-2">
                        <Label htmlFor="reset-email">Recovery Email</Label>
                        <Input 
                            id="reset-email"
                            type="email" 
                            placeholder="Enter your registered email"
                            className="h-12 bg-secondary/50 dark:bg-secondary/30 border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all rounded-xl"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-xl text-base font-medium" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Send Reset Link"}
                    </Button>
                    <div className="text-center">
                        <button 
                            type="button"
                            onClick={() => { setIsLogin(true); setError(null); }}
                            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                </form>
             )}
        </div>
      </div>
    </div>
  )
}
