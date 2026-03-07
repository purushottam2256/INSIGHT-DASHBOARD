import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export type UserRole = 'faculty' | 'hod' | 'principal' | 'management' | 'admin' | 'developer' | 'class_incharge' | 'lab_incharge' | null;

export const useUserRole = () => {
    const [role, setRole] = useState<UserRole>(null);
    const [dept, setDept] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [hasPassword, setHasPassword] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                setLoading(true);
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);


                if (!session?.user?.email) {
                    setRole(null);
                    setDept(null);
                    setHasPassword(null);
                    setLoading(false);
                    return;
                }

                // Check if user has a password by looking at their identities or auth methods
                // Supabase users created via 'magiclink' only, or those who haven't set a password,
                // will not have an 'email' provider identity with a password, or we can check app_metadata.
                const hasPass = session.user.app_metadata?.providers?.includes('email') && 
                                session.user.identities?.some(id => id.provider === 'email');
                setHasPassword(!!hasPass);

                const email = session.user.email;

                // 1. Check Admin Table via RPC (Bypasses RLS)
                // Using RPC allows us to use security definer to bypass RLS policies on the admins table
                // Note: Admins usually don't have a specific dept, or they have access to all.
                const { data: adminRole, error: _adminError } = await supabase
                    .rpc('get_user_admin_role', { check_email: email });


                // 2. Fetch Profile Data (Always fetch to get Dept, even if Admin)
                const { data: profile, error: _profileError } = await supabase
                    .from('profiles')
                    .select('role, dept')
                    .eq('id', session.user.id)
                    .single();


                // Determine Final Role & Dept
                // Admin table takes precedence for Role, but we need Profile for Dept
                const finalRole = (adminRole as UserRole) || (profile?.role as UserRole) || null;
                const finalDept = profile?.dept || null;


                setRole(finalRole);
                setDept(finalDept);

            } catch (err: any) {
                console.error("Error fetching user role:", err);
                setError(err.message);
                setRole(null);
                setDept(null);
                setHasPassword(null);
            } finally {
                setLoading(false);
            }
        };

        fetchRole();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
             setSession(session);
             if (!session) {
                setRole(null);
                setDept(null);
                setHasPassword(null);
            }
        });

        return () => subscription.unsubscribe();

    }, []);

    return { role, dept, session, loading, error, hasPassword };
};
