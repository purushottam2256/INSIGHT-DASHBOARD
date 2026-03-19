import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Immediate scroll to top on path change
        window.scrollTo(0, 0);
        
        // Also scroll the main container if it handles its own overflow
        const mainScrollContainer = document.querySelector('main');
        if (mainScrollContainer) {
            mainScrollContainer.scrollTo(0, 0);
        }
    }, [pathname]);

    return null;
}
