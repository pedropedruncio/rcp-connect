-- Migration: Add status to FamilyMember for invitations

ALTER TABLE public."FamilyMember" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACCEPTED';

-- Ensure users can only be ACCEPTED in one family at a time
-- We could add a partial unique index:
CREATE UNIQUE INDEX IF NOT EXISTS "FamilyMember_person_accepted_idx" 
ON public."FamilyMember" ("personId") 
WHERE "status" = 'ACCEPTED';

CREATE OR REPLACE FUNCTION public.has_family_access(row_family_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_admin_or_pastor()
    OR EXISTS (
      SELECT 1
      FROM public."FamilyMember" fm
      WHERE fm."familyId" = row_family_id
        AND fm."personId" = public.current_person_id()
    )
$$;

CREATE OR REPLACE FUNCTION public.is_accepted_family_member(row_family_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."FamilyMember" fm
    WHERE fm."familyId" = row_family_id
      AND fm."personId" = public.current_person_id()
      AND fm.status = 'ACCEPTED'
  )
$$;

CREATE OR REPLACE FUNCTION public.family_has_no_members(row_family_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public."FamilyMember" fm
    WHERE fm."familyId" = row_family_id
  )
$$;

CREATE OR REPLACE FUNCTION public.person_has_accepted_family(row_person_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."FamilyMember" fm
    WHERE fm."personId" = row_person_id
      AND fm.status = 'ACCEPTED'
  )
$$;

DROP POLICY IF EXISTS "Family rows can be read by participants" ON public."Family";
CREATE POLICY "Family rows can be read by participants"
ON public."Family"
FOR SELECT
TO authenticated
USING (public.has_family_access(id));

DROP POLICY IF EXISTS "Families can be inserted by authenticated members" ON public."Family";
CREATE POLICY "Families can be inserted by authenticated members"
ON public."Family"
FOR INSERT
TO authenticated
WITH CHECK (public.current_person_id() IS NOT NULL);

DROP POLICY IF EXISTS "Family members can be read by participants" ON public."FamilyMember";
CREATE POLICY "Family members can be read by participants"
ON public."FamilyMember"
FOR SELECT
TO authenticated
USING (public.has_family_access("familyId"));

DROP POLICY IF EXISTS "Family invitations can be inserted by accepted members" ON public."FamilyMember";
CREATE POLICY "Family invitations can be inserted by accepted members"
ON public."FamilyMember"
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_pastor()
  OR (
    "personId" = public.current_person_id()
    AND status = 'ACCEPTED'
    AND public.family_has_no_members("familyId")
  )
  OR (
    "personId" <> public.current_person_id()
    AND status = 'PENDING'
    AND public.is_accepted_family_member("familyId")
  )
);

DROP POLICY IF EXISTS "Family invitations can be updated by invited person" ON public."FamilyMember";
CREATE POLICY "Family invitations can be updated by invited person"
ON public."FamilyMember"
FOR UPDATE
TO authenticated
USING (public.is_admin_or_pastor() OR "personId" = public.current_person_id())
WITH CHECK (public.is_admin_or_pastor() OR "personId" = public.current_person_id());

DROP POLICY IF EXISTS "Family invitations can be deleted by invited person" ON public."FamilyMember";
CREATE POLICY "Family invitations can be deleted by invited person"
ON public."FamilyMember"
FOR DELETE
TO authenticated
USING (public.is_admin_or_pastor() OR "personId" = public.current_person_id());
