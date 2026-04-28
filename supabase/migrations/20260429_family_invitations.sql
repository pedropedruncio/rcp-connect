-- Migration: Add status to FamilyMember for invitations

ALTER TABLE public."FamilyMember" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACCEPTED';

-- Ensure users can only be ACCEPTED in one family at a time
-- We could add a partial unique index:
CREATE UNIQUE INDEX IF NOT EXISTS "FamilyMember_person_accepted_idx" 
ON public."FamilyMember" ("personId") 
WHERE "status" = 'ACCEPTED';
