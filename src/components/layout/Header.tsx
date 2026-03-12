import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Moon, Sun, Menu, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/components/theme-provider';
import { useSearch } from '@/hooks/useSearch';
import SearchResults from '@/components/layout/SearchResults';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
    '/dashboard': { title: 'Dashboard', subtitle: 'Overview & Analytics' },
    '/registration': { title: 'Registration', subtitle: 'Students & Faculty' },
    '/timetable': { title: 'Timetable', subtitle: 'Schedule Management' },
    '/attendance-manager': { title: 'Monthly Overview', subtitle: 'Track & Manage' },
    '/leaves': { title: 'Leave Manager', subtitle: 'Two-Stage Approvals' },
    '/compare': { title: 'Compare', subtitle: 'Analytics & Trends' },
    '/reports': { title: 'Reports', subtitle: 'Generate & Export' },
    '/project-fees': { title: 'Project Fees', subtitle: 'Fee Collection & Tracking' },
    '/benchmarking': { title: 'Benchmarking', subtitle: 'Department Performance' },
    '/sections': { title: 'Sections', subtitle: 'Merge & Split' },
    '/calendar': { title: 'Calendar', subtitle: 'Events & Holidays' },
    '/audit-log': { title: 'Audit Log', subtitle: 'Accountability Trail' },
    '/broadcast': { title: 'Broadcast', subtitle: 'Announcements' },
    '/semester-upgrade': { title: 'Semester Manager', subtitle: 'Red Zone ⚠️' },
    '/settings': { title: 'Settings', subtitle: 'Configuration' },
    '/help': { title: 'Help & Support', subtitle: 'Guides & FAQ' },
    '/student-overview': { title: 'Student Overview', subtitle: 'Individual Analytics' },
    '/faculty-overview': { title: 'Faculty Overview', subtitle: 'Performance & Details' },
    '/complaints': { title: 'Complaints & Suggestions', subtitle: 'Student Feedback' },
};

interface HeaderProps {
    onMenuClick: () => void;
    userName?: string;
}

const Header = ({ onMenuClick, userName }: HeaderProps) => {
    const { theme, setTheme } = useTheme();
    const location = useLocation();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { results, loading: searchLoading } = useSearch(query);

    const currentPage = pageTitles[location.pathname] || { title: 'Dashboard', subtitle: 'Overview' };
    const firstName = userName ? userName.split(' ')[0] : 'User';

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false);
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Ctrl+K / Cmd+K keyboard shortcut to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setSearchFocused(true);
                setShowResults(true);
            }
            if (e.key === 'Escape') {
                inputRef.current?.blur();
                setShowResults(false);
                setSearchFocused(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="h-[90px] px-6 md:px-10 flex items-center justify-between sticky top-0 z-40 transition-all duration-500 bg-background/50 backdrop-blur-[24px] border-b border-border/40 dark:border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
            {/* Header Ambient Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-70 mix-blend-screen">
                <div className="absolute -top-[50%] left-[20%] w-[500px] h-[250px] bg-primary/20 blur-[80px] rounded-full" />
                <div className="absolute -top-[50%] right-[20%] w-[500px] h-[250px] bg-orange-500/15 blur-[80px] rounded-full" />
            </div>

            {/* Left: Mobile Menu + Title/Greeting */}
            <div className="flex items-center gap-5 relative z-10 w-full max-w-[50%]">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden text-foreground hover:bg-secondary/60 rounded-xl" 
                    onClick={onMenuClick}
                >
                    <Menu className="h-6 w-6" />
                </Button>
                
                <div className="flex flex-col justify-center h-full">
                    {location.pathname === '/dashboard' ? (
                        <motion.h1 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-[26px] tracking-tight font-outfit text-foreground font-semibold flex items-center gap-2.5"
                        >
                            Welcome, <span className="font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-500">{firstName}!</span> <span className="text-[26px] drop-shadow-sm origin-bottom hover:rotate-12 transition-transform cursor-default">👋</span>
                        </motion.h1>
                    ) : (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                            <h1 className="text-2xl font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">{currentPage.title}</h1>
                            {currentPage.subtitle && (
                                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/80 mt-1 hidden sm:block">{currentPage.subtitle}</p>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Right: Search & Actions */}
            <div className="flex items-center gap-4 relative z-10 ml-auto justify-end">
                
                {/* Search Bar - Desktop */}
                <div ref={searchRef} className="relative hidden lg:block group">
                    <div className={cn(
                        "absolute inset-0 rounded-full transition-all duration-500",
                        searchFocused 
                            ? "bg-primary/5 ring-2 ring-primary/40 shadow-[0_0_20px_rgba(var(--primary),0.2)]" 
                            : "ring-1 ring-border shadow-sm group-hover:ring-primary/30 group-hover:bg-primary/[0.02]"
                    )} />
                    <Search className={cn(
                        "absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-300",
                        searchFocused ? "text-primary scale-110" : "text-muted-foreground/60 group-hover:text-primary/70"
                    )} />
                    {searchLoading && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                    )}
                    <Input 
                        ref={inputRef}
                        placeholder="Search students, faculty, etc..." 
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => {
                            setSearchFocused(true);
                            if (query.length >= 2) setShowResults(true);
                        }}
                        onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                        className="pl-12 pr-24 w-[360px] h-[46px] rounded-full bg-white/50 dark:bg-card/30 border-none focus:bg-white dark:focus:bg-card transition-all duration-500 text-[13px] font-medium text-foreground relative z-10 focus-visible:ring-0 placeholder:text-muted-foreground/50"
                    />
                    {!query && !searchLoading && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-muted-foreground/40 pointer-events-none z-10">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-secondary px-2 py-0.5 rounded-md border border-border/50 shadow-sm text-foreground/50">Ctrl K</span>
                        </div>
                    )}
                    {query && (
                        <button 
                            onClick={() => { setQuery(''); setShowResults(false); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 p-1 rounded-full transition-colors z-10"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    
                    {/* Search Results Dropdown */}
                    {showResults && query.length >= 2 && (
                        <div className="absolute top-[calc(100%+8px)] right-0 w-[400px]">
                            <SearchResults
                                results={results}
                                loading={searchLoading}
                                query={query}
                                onClose={() => setShowResults(false)}
                            />
                        </div>
                    )}
                </div>

                {/* Mobile Search Toggle */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden h-11 w-11 rounded-full hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20 bg-secondary/40"
                    onClick={() => setShowMobileSearch(!showMobileSearch)}
                >
                    <Search className="h-[18px] w-[18px]" />
                </Button>

                <div className="h-6 w-px bg-border/60 mx-1 hidden md:block"></div>

                {/* Theme Toggle — Premium Pill */}
                <div className="flex items-center bg-secondary/80 dark:bg-white/[0.04] rounded-full p-1 border border-border/50 dark:border-white/[0.08] relative overflow-hidden shadow-inner flex-shrink-0">
                    {/* Sliding background indicator */}
                    <div className={cn(
                        "absolute h-[34px] w-[34px] rounded-full shadow-md transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        theme === 'dark' 
                            ? "translate-x-[calc(100%+4px)] bg-card border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                            : "translate-x-0 bg-white border border-border/50 shadow-[0_0_15px_rgba(0,0,0,0.05)]"
                    )} />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "h-[34px] w-[34px] rounded-full transition-all duration-300 relative z-10 hover:bg-transparent cursor-pointer",
                            theme === 'light' ? "text-amber-500" : "text-muted-foreground/60 hover:text-foreground hover:scale-110"
                        )}
                        onClick={() => setTheme('light')}
                    >
                        <Sun size={15} strokeWidth={theme === 'light' ? 2.5 : 2} />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "h-[34px] w-[34px] rounded-full transition-all duration-300 relative z-10 hover:bg-transparent ml-1 cursor-pointer",
                            theme === 'dark' ? "text-primary" : "text-muted-foreground/60 hover:text-foreground hover:scale-110"
                        )}
                        onClick={() => setTheme('dark')}
                    >
                        <Moon size={15} strokeWidth={theme === 'dark' ? 2.5 : 2} />
                    </Button>
                </div>
            </div>

            {/* Mobile Search Overlay */}
            <AnimatePresence>
                {showMobileSearch && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-full left-0 right-0 p-4 bg-background/95 backdrop-blur-2xl border-b border-border/60 shadow-2xl z-50 lg:hidden"
                    >
                        <div ref={searchRef} className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-primary" />
                            <Input 
                                placeholder="Search everything..." 
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setShowResults(true);
                                }}
                                autoFocus
                                className="pl-12 pr-12 h-14 rounded-2xl bg-secondary/80 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-[15px] shadow-inner font-medium"
                            />
                            <button 
                                onClick={() => { setQuery(''); setShowMobileSearch(false); setShowResults(false); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-foreground/5 p-1.5 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            {showResults && query.length >= 2 && (
                                <div className="mt-4">
                                    <SearchResults
                                        results={results}
                                        loading={searchLoading}
                                        query={query}
                                        onClose={() => { setShowResults(false); setShowMobileSearch(false); }}
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

// Utility
function cn(...inputs: (string | boolean | undefined | null)[]) {
    return inputs.filter(Boolean).join(' ');
}

export default Header;

