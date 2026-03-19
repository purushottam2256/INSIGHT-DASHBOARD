import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showBackOnline, setShowBackOnline] = useState(false);

    useEffect(() => {
        const handleOffline = () => {
            setIsOnline(false);
            setShowBackOnline(false);
            toast.error("You are offline", { 
                description: "Features requiring database access will not work until connection is restored.",
                duration: Infinity,
                id: 'offline-toast'
            });
        };

        const handleOnline = () => {
            setIsOnline(true);
            toast.dismiss('offline-toast');
            setShowBackOnline(true);
            setTimeout(() => setShowBackOnline(false), 3000);
            
            toast.success("Back online", { 
                description: "Connection restored.",
                duration: 3000
            });
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        // Pre-check on mount to ensure accurate initial state
        if (!navigator.onLine) {
            handleOffline();
        }

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    if (isOnline && !showBackOnline) return null;

    return (
        <div 
            className={cn(
                "fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border backdrop-blur-md transition-all duration-500 max-w-[90vw] print:hidden animate-in slide-in-from-bottom-5",
                !isOnline 
                    ? "bg-red-500/20 border-red-500/30 text-red-500 dark:text-red-400"
                    : "bg-green-500/20 border-green-500/30 text-green-600 dark:text-green-400"
            )}
        >
            {!isOnline ? (
                <>
                    <WifiOff className="h-4 w-4 animate-pulse" />
                    <span className="text-sm font-medium tracking-tight whitespace-nowrap">No Internet Connection</span>
                </>
            ) : (
                <>
                    <Wifi className="h-4 w-4" />
                    <span className="text-sm font-medium tracking-tight whitespace-nowrap">Connection Restored</span>
                </>
            )}
        </div>
    );
}
