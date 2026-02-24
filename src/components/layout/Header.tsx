import { useState, useRef, useEffect } from 'react';
import { Search, Moon, Sun, Menu, MoreVertical, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';
import { useSearch } from '@/hooks/useSearch';
import SearchResults from '@/components/layout/SearchResults';
import logo from '@/assets/favicon.ico';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
    const { theme, setTheme } = useTheme();
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const { results, loading: searchLoading } = useSearch(query);

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasResults = results.students.length > 0 || results.faculty.length > 0 || results.subjects.length > 0 || results.sessions.length > 0;

    return (
        <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-40 transition-all duration-300 shadow-sm">
            {/* Left: Logo & Branding */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:bg-primary/10" onClick={onMenuClick}>
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
                        <img src={logo} alt="Insight Logo" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">
                            INSIGHT
                        </h1>
                        <span className="text-[10px] text-muted-foreground font-medium tracking-wide leading-tight hidden sm:block">
                            Empowering Education
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: Search & Actions */}
            <div className="flex items-center gap-2 md:gap-3">
                
                {/* Search Bar - Desktop */}
                <div ref={searchRef} className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    {searchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary animate-spin" />
                    )}
                    <Input 
                        placeholder="Search students, faculty, subjects..." 
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => query.length >= 2 && setShowResults(true)}
                        className="pl-10 pr-9 w-72 h-9 rounded-full bg-secondary/60 dark:bg-secondary/40 border-border/50 focus:border-primary/40 focus:bg-card focus:ring-1 focus:ring-primary/20 transition-all duration-300 text-sm placeholder:text-muted-foreground/70"
                    />
                    {query && (
                        <button 
                            onClick={() => { setQuery(''); setShowResults(false); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                    className="md:hidden h-8 w-8 rounded-full hover:bg-primary/10"
                    onClick={() => setShowMobileSearch(!showMobileSearch)}
                >
                    <Search className="h-4 w-4" />
                </Button>

                {/* Day/Night Toggle */}
                <div className="flex items-center bg-secondary/50 dark:bg-secondary/40 rounded-full p-0.5 border border-border/50">
                    <Button 
                        variant={theme === 'light' ? 'default' : 'ghost'} 
                        size="icon" 
                        className={`h-7 w-7 rounded-full transition-all ${theme === 'light' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setTheme('light')}
                    >
                        <Sun size={13} />
                    </Button>
                    <Button 
                        variant={theme === 'dark' ? 'default' : 'ghost'} 
                        size="icon" 
                        className={`h-7 w-7 rounded-full transition-all ${theme === 'dark' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setTheme('dark')}
                    >
                        <Moon size={13} />
                    </Button>
                </div>

                {/* Option Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary">
                            <MoreVertical size={18} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 backdrop-blur-xl">
                        <DropdownMenuItem>Profile</DropdownMenuItem>
                        <DropdownMenuItem>Settings</DropdownMenuItem>
                        <DropdownMenuItem>Help & Support</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Mobile Search Overlay */}
            {showMobileSearch && (
                <div className="absolute top-full left-0 right-0 p-3 bg-card/95 backdrop-blur-xl border-b border-border/60 shadow-lg z-50 md:hidden">
                    <div ref={searchRef} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

export default Header;
