import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Reads ?highlight=<term> from URL and returns:
 * - highlightTerm: the decoded search term
 * - isHighlighted(text): true if text matches the highlight term
 * - highlightClass(text): returns 'search-highlight' if matching, '' otherwise
 * 
 * Auto-clears the highlight param after 4 seconds so it doesn't persist.
 */
export function useSearchHighlight() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [highlightTerm, setHighlightTerm] = useState<string>('');

    useEffect(() => {
        const param = searchParams.get('highlight');
        if (param) {
            setHighlightTerm(decodeURIComponent(param));
            // Clear the URL param after 4s so it doesn't stick on refresh
            const timer = setTimeout(() => {
                searchParams.delete('highlight');
                setSearchParams(searchParams, { replace: true });
                setHighlightTerm('');
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, setSearchParams]);

    const isHighlighted = (text: string): boolean => {
        if (!highlightTerm) return false;
        return text.toLowerCase().includes(highlightTerm.toLowerCase());
    };

    const highlightClass = (text: string): string => {
        return isHighlighted(text) ? 'search-highlight' : '';
    };

    return { highlightTerm, isHighlighted, highlightClass };
}
