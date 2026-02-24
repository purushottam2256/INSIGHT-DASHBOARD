-- securely get admin role by email (Case Insensitive)
-- This function runs with SECURITY DEFINER, meaning it bypasses RLS policies

CREATE OR REPLACE FUNCTION public.get_user_admin_role(check_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_role TEXT;
BEGIN
    SELECT role INTO found_role
    FROM public.admins
    WHERE email ILIKE check_email; -- ILIKE for case-insensitive matching
    
    RETURN found_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_admin_role(TEXT) TO authenticated;
