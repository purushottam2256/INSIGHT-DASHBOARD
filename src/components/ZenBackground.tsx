import { motion } from "framer-motion";

export default function ZenBackground() {
  return (
    <div className="fixed inset-0 z-0 w-full h-full overflow-hidden pointer-events-none bg-background transition-colors duration-500">
      
      {/* 1. Base Layer */}
      <div className="absolute inset-0 bg-secondary/20 dark:bg-background" />

      {/* 2. Animated Ambient Glowing Orbs */}
      <motion.div 
        animate={{ 
            scale: [1, 1.2, 1], 
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 90, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[10%] -left-[5%] w-[40vw] h-[40vw] rounded-full bg-primary/20 blur-[120px] mix-blend-screen" 
      />
      
      <motion.div 
        animate={{ 
            scale: [1, 1.3, 1], 
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, -90, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-orange-500/20 blur-[130px] mix-blend-screen" 
      />

      <motion.div 
        animate={{ 
            scale: [1, 1.1, 1], 
            opacity: [0.15, 0.3, 0.15]
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[150px] mix-blend-screen" 
      />

      {/* 3. High-Quality Grain Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] z-10 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      {/* 4. Soft Vignette */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.03)_120%)] dark:bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.5)_120%)]" />
    </div>
  );
}
