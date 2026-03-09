import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'faculty' | 'hod' | 'principal' | 'management' | 'admin' | 'developer' | 'class_incharge' | 'lab_incharge' | null;

export const useUserRole = () => {
    const { role, profile, session, user, loading } = useAuth();

    // Check if user has a password by looking at their identities or auth methods
    // Defaulting to false if user is null
    const hasPassword = user 
        ? !!(user.app_metadata?.providers?.includes('email') && user.identities?.some(id => id.provider === 'email'))
        : null;

    return { 
        role: role as UserRole, 
        dept: profile?.dept || null, 
        session, 
        loading, 
        error: null, 
        hasPassword
    };
};
