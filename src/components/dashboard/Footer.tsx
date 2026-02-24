
import { Heart } from 'lucide-react';

const Footer = () => {
  const year = new Date().getFullYear();
  
  return (
    <footer className="mt-12 py-8 border-t border-border/30 relative overflow-hidden">
        {/* Decorative top line */}
        <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center md:items-start max-w-sm text-center md:text-left">
            <h3 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                INSIGHT
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
                Hard work beats talent when talent doesn't work hard.
            </p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-1">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground/80">
                <span>Made with</span>
                <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 animate-pulse" />
                <span>by Team-8</span>
            </div>
            <span className="text-[10px] text-muted-foreground/50">
                © {year} INSIGHT Dashboard • v2.0
            </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
