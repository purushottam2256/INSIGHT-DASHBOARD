import { GraduationCap, User, BookOpen, ClipboardList, Loader2, SearchX, ArrowRight, Navigation } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import type { SearchResults as SearchResultsType, SearchResultItem } from '@/hooks/useSearch';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResultsProps {
    results: SearchResultsType;
    loading: boolean;
    query: string;
    onClose: () => void;
}

const categoryConfig = {
    keywords: { icon: Navigation, label: 'Quick Links', color: 'text-emerald-500', route: '' },
    students: { icon: GraduationCap, label: 'Students', color: 'text-primary', route: '/student-overview' },
    faculty: { icon: User, label: 'Faculty', color: 'text-amber-600 dark:text-amber-400', route: '/faculty-overview' },
    subjects: { icon: BookOpen, label: 'Subjects', color: 'text-orange-700 dark:text-orange-300', route: '/timetable' },
    sessions: { icon: ClipboardList, label: 'Sessions', color: 'text-orange-500 dark:text-orange-400', route: '/attendance-manager' },
};

const SearchResults = ({ results, loading, query, onClose }: SearchResultsProps) => {
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const hasResults = results.keywords.length > 0 || results.students.length > 0 || results.faculty.length > 0 || results.subjects.length > 0 || results.sessions.length > 0;

    const handleResultClick = (item: SearchResultItem, category: keyof typeof categoryConfig) => {
        if (category === 'keywords') {
            const anyItem = item as any;
            if (anyItem.route === 'logout') {
                signOut();
            } else {
                navigate(anyItem.route);
            }
        } else if (category === 'students') {
            navigate(`/student-overview?id=${item.id}`);
        } else if (category === 'faculty') {
            navigate(`/faculty-overview?id=${item.id}`);
        } else {
            const config = categoryConfig[category];
            const separator = config.route.includes('?') ? '&' : '?';
            const highlightParam = `${separator}highlight=${encodeURIComponent(item.title)}`;
            navigate(config.route + highlightParam);
        }
        onClose();
    };

    return (
        <div className="absolute top-full mt-2 left-0 right-0 w-full min-w-[340px] bg-card/98 dark:bg-card/98 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 z-50 overflow-hidden animate-fade-in-scale">
            <ScrollArea className="max-h-[420px]">
                <div className="p-2">
                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm">Searching...</span>
                        </div>
                    )}

                    {/* No Results */}
                    {!loading && !hasResults && query.length >= 2 && (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                            <SearchX className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm">No results for "<span className="font-medium text-foreground">{query}</span>"</p>
                            <p className="text-xs text-muted-foreground/70">Try a different keyword</p>
                        </div>
                    )}

                    {/* Results by Category */}
                    {!loading && hasResults && (
                        <>
                            {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map((category) => {
                                const items = results[category];
                                if (items.length === 0) return null;
                                const config = categoryConfig[category];
                                const Icon = config.icon;

                                return (
                                    <div key={category} className="mb-1">
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                {config.label}
                                            </span>
                                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                                {items.length}
                                            </span>
                                        </div>

                                        {items.map((item: SearchResultItem) => (
                                            <button
                                                key={item.id}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/80 dark:hover:bg-accent/60 transition-colors text-left group"
                                                onClick={() => handleResultClick(item, category)}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                                        {highlightMatch(item.title, query)}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                        <span className="truncate">{highlightMatch(item.subtitle, query)}</span>
                                                        {item.meta && (
                                                            <>
                                                                <span className="text-border">•</span>
                                                                <span className="shrink-0 text-muted-foreground/70">{item.meta}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            {hasResults && !loading && (
                <div className="border-t border-border/50 px-4 py-2">
                    <p className="text-[10px] text-muted-foreground/60 text-center">
                        Click a result to navigate · <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground text-[9px] font-mono">Esc</kbd> to close
                    </p>
                </div>
            )}
        </div>
    );
};

/** Highlight matching text within a string */
function highlightMatch(text: string, query: string) {
    if (!query || query.length < 2) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <span className="bg-primary/15 text-primary font-semibold rounded-sm px-0.5">
                {text.slice(idx, idx + query.length)}
            </span>
            {text.slice(idx + query.length)}
        </>
    );
}

export default SearchResults;
