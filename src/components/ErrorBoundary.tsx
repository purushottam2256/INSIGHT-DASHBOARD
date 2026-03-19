import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component tree:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-md w-full glass-panel p-8 md:p-12 text-center relative z-10 border border-red-500/20 shadow-2xl shadow-red-500/5">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            
            <h1 className="text-3xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
              Something went wrong
            </h1>
            
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              We encountered an unexpected error. Please try reloading the page. If the problem persists, return to the dashboard.
            </p>

            <div className="text-left bg-black/40 border border-white/10 rounded-lg p-4 mb-8 overflow-auto max-h-[150px]">
              <code className="text-xs text-red-400 font-mono whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown application error'}
              </code>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={this.handleReset}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
              <Button 
                onClick={this.handleHome}
                variant="outline"
                className="flex-1 border-white/10 hover:bg-white/5"
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
