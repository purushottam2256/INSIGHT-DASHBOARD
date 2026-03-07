

export default function ZenBackground() {
  return (
    <div className="fixed inset-0 z-0 w-full h-full overflow-hidden pointer-events-none bg-background transition-colors duration-500">
      
      {/* 1. Base Layer (Soft Neutral/Blueish tint from reference) */}
      <div className="absolute inset-0 bg-[#F4F7F9] dark:bg-[#0A0D14]" />

      {/* 2. Very Subtle Warm Gradients (Right side) */}
      {/* Top right soft orange/peach glow */}
      <div className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-orange-500/5 dark:bg-orange-500/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen transition-opacity duration-1000" />
      
      {/* Bottom right soft teal/blue glow balancing the orange */}
      <div className="absolute -bottom-[20%] -right-[20%] w-[70vw] h-[70vw] rounded-full bg-slate-400/10 dark:bg-slate-500/10 blur-[150px] mix-blend-multiply dark:mix-blend-screen transition-opacity duration-1000" />

      {/* Center ambient light */}
      <div className="absolute top-[30%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-white/40 dark:bg-white/5 blur-[100px] mix-blend-overlay" />

      {/* 3. Extremely Fine Premium Noise Overlay (Apple/Minimalist Style) */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] z-10 mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      {/* 4. Soft Vignette around the very edges to frame the dashboard perfectly */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.02)_120%)] dark:bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.4)_120%)]" />
    </div>
  );
}
