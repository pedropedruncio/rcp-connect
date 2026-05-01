-- Migration: Fix INSERT RLS policy on public."Family"
-- Problem: "Only admins can insert families" blocks authenticated users from creating families.
-- Fix: Replace that specific INSERT policy to allow any authenticated user to insert.
-- Safe: only touches the INSERT policy. SELECT/UPDATE/DELETE policies are untouched.
-- Idempotent: DROP IF EXISTS before CREATE.

-- Drop only the INSERT policy (no other policies are affected)
DROP POLICY IF EXISTS "Only admins can insert families" ON public."Family";

-- Allow any authenticated user to create a family
-- (no ownerId column exists, so we cannot restrict by creator — with check (true) is correct)
CREATE POLICY "Authenticated users can create families"
ON public."Family"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
