export default function ZenBackground() {
  return (
    <div className="absolute inset-0 z-0 w-full h-full overflow-hidden bg-background">
      {/* Noise Texture Overlay for Premium Feel */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] z-10 pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      {/* Moving Orbs Container — All warm orange family */}
      <div className="absolute inset-0 z-0 blur-[100px] saturate-150 transform-gpu overflow-hidden">
        
        {/* Orb 1: Warm Orange — Top Left */}
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-[hsl(28,90%,60%)]/20 dark:bg-[hsl(28,80%,45%)]/15 animate-zen-blob mix-blend-multiply dark:mix-blend-screen" />
        
        {/* Orb 2: Deep Amber — Bottom Right */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[hsl(25,85%,50%)]/20 dark:bg-[hsl(25,70%,35%)]/15 animate-zen-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-screen" />
        
        {/* Orb 3: Golden — Center */}
        <div className="absolute top-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-[hsl(40,90%,65%)]/20 dark:bg-[hsl(35,70%,30%)]/15 animate-zen-blob animation-delay-4000 mix-blend-multiply dark:mix-blend-screen" />

         {/* Orb 4: Peach / light caramel for depth */}
         <div className="absolute top-[40%] right-[20%] w-[40vw] h-[40vw] rounded-full bg-[hsl(20,80%,75%)]/15 dark:bg-[hsl(20,60%,25%)]/10 animate-pulse duration-[10000ms] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 z-[1] bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
  );
}
