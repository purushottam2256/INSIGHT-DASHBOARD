import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useUserRole, UserRole } from '@/hooks/useUserRole';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { role, loading, session } = useUserRole();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // 1. Not logged in -> Login
    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Logged in but checking specific roles
    // If role is null here, it means they are logged in but have no role assigned (or not found in admin/profile)
    // In strict mode, no role = unauthorized for dashboard
    if (allowedRoles && (!role || !allowedRoles.includes(role))) {
        return <Navigate to="/unauthorized" replace />;
    }

    // 3. Authorized
    return <>{children}</>;
};
