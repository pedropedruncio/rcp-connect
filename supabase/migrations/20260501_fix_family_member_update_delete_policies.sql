-- Migration: Fix UPDATE and DELETE policies on public."FamilyMember"
-- Purpose: Allow users to accept (UPDATE) or reject (DELETE) their own pending invitations.

-- 1. UPDATE policy
DROP POLICY IF EXISTS "Only admins can update family members" ON public."FamilyMember";

CREATE POLICY "Users can accept their own pending invites and admins can update all"
ON public."FamilyMember"
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_pastor() OR 
  ("personId" = public.current_person_id() AND status = 'PENDING')
)
WITH CHECK (
  public.is_admin_or_pastor() OR 
  ("personId" = public.current_person_id() AND status IN ('ACCEPTED', 'REJECTED'))
);

-- 2. DELETE policy
DROP POLICY IF EXISTS "Admins can delete family members" ON public."FamilyMember";
DROP POLICY IF EXISTS "Users can delete their own pending invites and admins can delete all" ON public."FamilyMember";

CREATE POLICY "Users can delete their own pending invites and admins can delete all"
ON public."FamilyMember"
FOR DELETE
TO authenticated
USING (
  public.is_admin_or_pastor() OR 
  ("personId" = public.current_person_id() AND status = 'PENDING')
);

NOTIFY pgrst, 'reload schema';
