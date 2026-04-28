## 2025-05-22 - Server-side RBAC and Error Suppression
**Vulnerability:** API mutations were proxied to Supabase without server-side role validation, and internal 500 error details were being leaked to the client.
**Learning:** Relying solely on Supabase RLS for authorization is a single point of failure. Adding a server-side RBAC layer provides Defense in Depth. Verbose error messages in the central API handler can leak database schema details.
**Prevention:** Implement a RESOURCE_REQUIRED_ROLES mapping in the central API handler and suppress detailed 500 error messages in production-ready gateways.
