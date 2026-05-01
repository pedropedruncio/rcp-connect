-- Migration: Fix INSERT RLS policy on public."FamilyMember"
-- Problem: "Only admins can insert family members" blocks the invitation flow.
-- Fix: Allow authenticated users to insert themselves as ACCEPTED (when creating a family) 
--      or others as PENDING (when sending an invite).
-- Safe: only touches the INSERT policy. SELECT/UPDATE/DELETE policies are untouched.
-- Idempotent: DROP IF EXISTS before CREATE.

DROP POLICY IF EXISTS "Only admins can insert family members" ON public."FamilyMember";

CREATE POLICY "Authenticated users can insert family members"
ON public."FamilyMember"
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_pastor() OR 
  "status" = 'PENDING' OR 
  ("status" = 'ACCEPTED' AND "personId" = public.current_person_id())
);

NOTIFY pgrst, 'reload schema';
