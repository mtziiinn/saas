# Security Checklist

## Per-Feature Security Checklist

| Category | Check | Action |
|----------|-------|--------|
| **Auth** | Endpoint requires authentication? | Add auth middleware/guard |
| **Authz** | User authorized for this action? | Check ownership/role |
| **Input** | All input validated and sanitized? | Use schemas, sanitize |
| **Output** | Sensitive data excluded from response? | Filter response fields |
| **Rate Limit** | Endpoint rate limited? | Add rate limiter |
| **Logging** | Security events logged? | Log auth failures, changes |

## Quick Reference

| Risk | Mitigation |
|------|------------|
| SQL Injection | Parameterized queries |
| XSS | Output encoding, CSP |
| CSRF | CSRF tokens, SameSite cookies |
| IDOR | Authorization checks |
| Brute Force | Rate limiting |
| Data Exposure | Response filtering |
