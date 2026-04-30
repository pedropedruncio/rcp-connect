## 2025-05-15 - Information Leakage via Detailed Error Messages
**Vulnerability:** Detailed internal server error messages (500) were being exposed to the client, potentially leaking database schema, stack traces, and internal logic.
**Learning:** The global API handler did not have a centralized mechanism to suppress sensitive details for unhandled exceptions or 500 status codes.
**Prevention:** Implement a catch-all error handling wrapper that maps 500 status codes to a generic "Erro interno no servidor." message while logging the full details on the server for debugging.

## 2025-05-15 - Missing Server-Side Authorization for Notifications
**Vulnerability:** The `notifications` mutation endpoints lacked explicit server-side RBAC checks in `assertMutationPermission`, potentially allowing authenticated users to bypass intended restrictions if the frontend was manipulated.
**Learning:** Adding new API resources requires updating the server-side authorization layer (`authorization.js`) to ensure "secure by default" behavior.
**Prevention:** Always add explicit resource-level permission checks in `assertMutationPermission` for all new mutation endpoints.
