-- Drop the old policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "admins_read_own" ON public.admins;

-- Create the correct policy using auth.jwt() which is safe and reliable
CREATE POLICY "admins_read_own" ON public.admins
    FOR SELECT
    TO authenticated
    USING (
        email = auth.jwt() ->> 'email'
    );
