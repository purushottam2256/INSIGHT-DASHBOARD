import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumLoaderProps {
    className?: string;
    text?: string;
    hideText?: boolean;
}

export function PremiumLoader({ className, text = "Loading...", hideText = false }: PremiumLoaderProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-6", className)}>
            <div className="relative w-16 h-16 flex items-center justify-center">
                {/* Ambient Glow */}
                <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-pulse" />
                
                {/* Outer Orbiting Ring 1 */}
                <div className="absolute inset-0 border-[3px] border-transparent border-t-primary border-r-primary/50 rounded-full animate-spin" style={{ animationDuration: '2.5s' }} />
                
                {/* Inner Orbiting Ring 2 */}
                <div className="absolute inset-[4px] border-[3px] border-transparent border-b-amber-500 border-l-amber-500/50 rounded-full animate-spin" style={{ animationDuration: '1.8s', animationDirection: 'reverse' }} />
                
                {/* Inner Floating Platform */}
                <div className="absolute inset-[10px] bg-secondary/80 rounded-full shadow-inner border border-border/50" />
                
                {/* Center Core Icon */}
                <Layers className="w-6 h-6 text-primary animate-bounce relative z-10" strokeWidth={2.5} style={{ animationDuration: '2s' }} />
            </div>
            
            {!hideText && (
                <div className="flex flex-col items-center gap-2">
                    <span className="text-[11px] font-black tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-500 font-outfit animate-pulse" style={{ animationDuration: '3s' }}>
                        {text}
                    </span>
                    <div className="flex gap-1.5 h-1 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}
        </div>
    );
}

export function FullPageLoader({ text }: { text?: string }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-xl animate-fade-in">
            <PremiumLoader text={text} />
        </div>
    );
}

export function SectionLoader({ text, className }: { text?: string, className?: string }) {
    return (
        <div className={cn("flex w-full h-full min-h-[250px] items-center justify-center", className)}>
            <PremiumLoader text={text} />
        </div>
    );
}
