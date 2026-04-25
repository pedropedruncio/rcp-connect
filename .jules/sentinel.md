## 2026-05-18 - Generic Error Responses for 500 Status Codes
**Vulnerability:** Information Leakage via Error Messages.
**Learning:** Detailed error messages (e.g., database schema details, stack traces) returned by the server on 500 errors can be exploited by attackers to gain insights into the application's internal structure and vulnerabilities.
**Prevention:** Implement a central error handler that catches all exceptions and returns a generic, non-informative message (e.g., 'Erro interno no servidor.') for 500 Internal Server Error status codes, while still allowing specific messages for client errors (4xx).
