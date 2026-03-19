import { AlertTriangle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="h-full w-full min-h-[400px] flex items-center justify-center p-6 relative">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="max-w-md w-full text-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-lg shadow-primary/5">
                    <AlertTriangle className="h-12 w-12 text-primary" />
                </div>
                
                <h1 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500">
                    404
                </h1>
                
                <h2 className="text-2xl font-bold text-foreground mb-4">
                    Page Not Found
                </h2>
                
                <p className="text-muted-foreground mb-10 leading-relaxed text-sm">
                    The portal page you are looking for does not exist, has been moved, or you don't have permission to view it.
                </p>

                <Button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
                >
                    <Home className="mr-2 h-5 w-5" />
                    Return to Dashboard
                </Button>
            </div>
        </div>
    );
}
