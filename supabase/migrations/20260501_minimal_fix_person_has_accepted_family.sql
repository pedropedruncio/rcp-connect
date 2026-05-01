-- Migration: Minimal fix for missing function public.person_has_accepted_family
-- Safe: CREATE OR REPLACE only. No table changes, no column additions, no RLS/policy changes.
-- Idempotent: can be run multiple times without side effects.

CREATE OR REPLACE FUNCTION public.person_has_accepted_family(row_person_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."FamilyMember" fm
    WHERE fm."personId" = row_person_id
      AND fm."status" = 'ACCEPTED'
  );
$$;

GRANT EXECUTE ON FUNCTION public.person_has_accepted_family(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
