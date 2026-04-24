## 2025-05-15 - Missing Server-Side Mutation Authorization
**Vulnerability:** The API handler lacked server-side authorization checks for mutation endpoints, relying entirely on Supabase RLS.
**Learning:** While RLS provides a layer of security, complex application logic or RLS misconfigurations can lead to unauthorized data modification if not enforced at the API level as well.
**Prevention:** Always implement a secondary layer of authorization (Defense in Depth) at the API handler level, especially for sensitive operations like role updates.
