import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Moon, Sun, Menu, X, Loader2, Command } from 'lucide-react';
import { NotificationCenter } from '@/components/layout/NotificationCenter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useTheme } from '@/components/theme-provider';
import { useSearch } from '@/hooks/useSearch';
import SearchResults from '@/components/layout/SearchResults';

interface HeaderProps {
    onMenuClick: () => void;
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
    '/dashboard': { title: 'Dashboard', subtitle: 'Overview & Analytics' },
    '/registration': { title: 'Registration', subtitle: 'Students & Faculty' },
    '/timetable': { title: 'Timetable', subtitle: 'Schedule Management' },
    '/attendance-manager': { title: 'Attendance', subtitle: 'Track & Manage' },
    '/leaves': { title: 'Leave Manager', subtitle: 'Two-Stage Approvals' },
    '/compare': { title: 'Compare', subtitle: 'Analytics & Trends' },
    '/reports': { title: 'Reports', subtitle: 'Generate & Export' },
    '/compliance': { title: 'Compliance', subtitle: 'Condonation & Eligibility' },
    '/benchmarking': { title: 'Benchmarking', subtitle: 'Department Performance' },
    '/sections': { title: 'Sections', subtitle: 'Merge & Split' },
    '/calendar': { title: 'Calendar', subtitle: 'Events & Holidays' },
    '/audit-log': { title: 'Audit Log', subtitle: 'Accountability Trail' },
    '/broadcast': { title: 'Broadcast', subtitle: 'Announcements' },
    '/semester-upgrade': { title: 'Semester Manager', subtitle: 'Red Zone ⚠️' },
    '/settings': { title: 'Settings', subtitle: 'Configuration' },
    '/help': { title: 'Help & Support', subtitle: 'Guides & FAQ' },
};

const Header = ({ onMenuClick }: HeaderProps) => {
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
        <header className="header-glass h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 transition-all duration-300">
            {/* Left: Mobile Menu + Page Title */}
            <div className="flex items-center gap-3">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden text-foreground hover:bg-primary/10 rounded-xl" 
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" />
                </Button>
                
                {/* Dynamic Page Title */}
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold tracking-tight text-foreground leading-tight">
                        {currentPage.title}
                    </h1>
                    {currentPage.subtitle && (
                        <span className="text-[10px] text-muted-foreground font-medium tracking-wide leading-tight hidden sm:block">
                            {currentPage.subtitle}
                        </span>
                    )}
                </div>
            </div>

            {/* Right: Search & Actions */}
            <div className="flex items-center gap-2 md:gap-3">
                
                {/* Search Bar - Desktop */}
                <div ref={searchRef} className="relative hidden md:block">
                    <div className={cn(
                        "absolute inset-0 rounded-full transition-all duration-500",
                        searchFocused 
                            ? "bg-primary/5 ring-2 ring-primary/20 shadow-[0_0_20px_hsl(28,90%,48%,0.1)]" 
                            : "ring-0 shadow-none"
                    )} />
                    <Search className={cn(
                        "absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200",
                        searchFocused ? "text-primary" : "text-muted-foreground/60"
                    )} />
                    {searchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary animate-spin" />
                    )}
                    <Input 
                        ref={inputRef}
                        placeholder="Search anything..." 
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
                        className="pl-10 pr-20 w-72 h-9 rounded-full bg-secondary/40 dark:bg-white/[0.04] border-border/30 dark:border-white/[0.06] focus:border-transparent focus:bg-card/80 dark:focus:bg-white/[0.06] transition-all duration-300 text-sm placeholder:text-muted-foreground/50 relative z-10 focus-visible:ring-0"
                    />
                    {!query && !searchLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground/40 pointer-events-none z-10">
                            <Command className="h-3 w-3" />
                            <span className="text-[10px] font-medium">K</span>
                        </div>
                    )}
                    {query && (
                        <button 
                            onClick={() => { setQuery(''); setShowResults(false); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    
                    {/* Search Results Dropdown */}
                    {showResults && query.length >= 2 && (
                        <SearchResults
                            results={results}
                            loading={searchLoading}
                            query={query}
                            onClose={() => setShowResults(false)}
                        />
                    )}
                </div>

                {/* Mobile Search Toggle */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden h-9 w-9 rounded-xl hover:bg-primary/10"
                    onClick={() => setShowMobileSearch(!showMobileSearch)}
                >
                    <Search className="h-4 w-4" />
                </Button>

                {/* Notification Center */}
                <div className="hidden sm:block">
                    <NotificationCenter />
                </div>

                {/* Theme Toggle — Premium Pill */}
                <div className="flex items-center bg-secondary/40 dark:bg-white/[0.04] rounded-full p-0.5 border border-border/30 dark:border-white/[0.06] relative overflow-hidden">
                    {/* Sliding background indicator */}
                    <div className={cn(
                        "absolute h-7 w-7 rounded-full bg-gradient-to-br from-primary to-amber-500 shadow-md shadow-primary/20 transition-all duration-300 ease-out",
                        theme === 'dark' ? "translate-x-[calc(100%)]" : "translate-x-0"
                    )} />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "h-7 w-7 rounded-full transition-all duration-300 relative z-10",
                            theme === 'light' ? "text-white hover:bg-transparent" : "text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
                        )}
                        onClick={() => setTheme('light')}
                    >
                        <Sun size={13} />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "h-7 w-7 rounded-full transition-all duration-300 relative z-10",
                            theme === 'dark' ? "text-white hover:bg-transparent" : "text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
                        )}
                        onClick={() => setTheme('dark')}
                    >
                        <Moon size={13} />
                    </Button>
                </div>
            </div>

            {/* Mobile Search Overlay */}
            {showMobileSearch && (
                <div className="absolute top-full left-0 right-0 p-3 bg-card/95 backdrop-blur-xl border-b border-border/60 shadow-lg z-50 md:hidden">
                    <div ref={searchRef} className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search..." 
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setShowResults(true);
                            }}
                            autoFocus
                            className="pl-10 pr-9 h-10 rounded-xl bg-secondary/60 border-border/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 text-sm"
                        />
                        <button 
                            onClick={() => { setQuery(''); setShowMobileSearch(false); setShowResults(false); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        {showResults && query.length >= 2 && (
                            <SearchResults
                                results={results}
                                loading={searchLoading}
                                query={query}
                                onClose={() => { setShowResults(false); setShowMobileSearch(false); }}
                            />
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

// Utility
function cn(...inputs: (string | boolean | undefined | null)[]) {
    return inputs.filter(Boolean).join(' ');
}

export default Header;
