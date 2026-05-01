-- Migration: Fix SELECT RLS policy on public."FamilyMember"
-- Problem: "Only admins can read family members" causes the backend to think a normal user 
--          doesn't have a family, leading to duplicate inserts and the 'FamilyMember_person_accepted_idx' error.
-- Fix: Allow users to read their own family members and members of their accepted families.

-- 1. Create a helper function to avoid infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_family_member(_family_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public."FamilyMember" 
    WHERE "familyId" = _family_id 
      AND "personId" = public.current_person_id()
  );
$$;

-- 2. Replace the admin-only SELECT policy
DROP POLICY IF EXISTS "Only admins can read family members" ON public."FamilyMember";

CREATE POLICY "Users can read their own family members or family"
ON public."FamilyMember"
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_pastor() OR 
  "personId" = public.current_person_id() OR
  public.is_family_member("familyId")
);

NOTIFY pgrst, 'reload schema';
