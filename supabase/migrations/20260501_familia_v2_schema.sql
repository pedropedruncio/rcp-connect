-- Migration: Familia V2 Schema additions
-- Purpose: Add fields to FamilyMember and create FamilyRemovalRequest table

-- 1. Add fields to FamilyMember
ALTER TABLE public."FamilyMember" 
ADD COLUMN IF NOT EXISTS "invitedByPersonId" text,
ADD COLUMN IF NOT EXISTS "acceptedAt" timestamptz;

-- 2. Create FamilyRemovalRequest table
CREATE TABLE IF NOT EXISTS public."FamilyRemovalRequest" (
  "id" text PRIMARY KEY,
  "familyId" text NOT NULL,
  "personId" text NOT NULL,
  "requestedByPersonId" text NOT NULL,
  "reason" text,
  "status" text NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "resolvedAt" timestamptz,
  "resolvedByPersonId" text
);

-- 3. Enable RLS on FamilyRemovalRequest
ALTER TABLE public."FamilyRemovalRequest" ENABLE ROW LEVEL SECURITY;

-- 4. Policies for FamilyRemovalRequest

-- SELECT: Users can read requests for families they belong to; Admins can read all.
CREATE POLICY "Users can read requests for their families or admins read all"
ON public."FamilyRemovalRequest"
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_pastor() OR 
  public.is_family_member("familyId")
);

-- INSERT: Users can create requests if they belong to the family.
CREATE POLICY "Users can create requests for their families"
ON public."FamilyRemovalRequest"
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_pastor() OR 
  public.is_family_member("familyId")
);

-- UPDATE: Only Admins can update requests (to approve/reject).
CREATE POLICY "Only admins can update requests"
ON public."FamilyRemovalRequest"
FOR UPDATE
TO authenticated
USING (public.is_admin_or_pastor())
WITH CHECK (public.is_admin_or_pastor());

-- DELETE: Only Admins can delete requests.
CREATE POLICY "Only admins can delete requests"
ON public."FamilyRemovalRequest"
FOR DELETE
TO authenticated
USING (public.is_admin_or_pastor());

NOTIFY pgrst, 'reload schema';
