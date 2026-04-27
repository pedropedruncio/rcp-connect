# Sentinel's Journal - Critical Security Learnings

This journal contains critical security learnings discovered during the protection of the RCP Connect codebase.

## 2025-05-22 - Server-Side RBAC for Mutation Proxying
**Vulnerability:** API mutation endpoints (/api/resource) relied solely on Supabase Row Level Security (RLS) for authorization. While RLS is effective, a misconfiguration in RLS policies could expose the database to unauthorized mutations.
**Learning:** The server-side API handler acted as a pass-through proxy for mutations without validating user roles against a resource-to-role mapping. This created a single point of failure if RLS was bypassed or misconfigured.
**Prevention:** Implement "Defense in Depth" by adding a server-side authorization layer that validates the user's role before proxying the mutation to Supabase. This ensures that even if RLS is overly permissive, the API gateway enforces baseline access control.
