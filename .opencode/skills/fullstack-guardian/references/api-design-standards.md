# API Design Standards

## RESTful Conventions
```
GET    /api/resource          # List
POST   /api/resource          # Create
GET    /api/resource/:id      # Get one
PATCH  /api/resource/:id      # Update
DELETE /api/resource/:id      # Delete
```

## HTTP Status Codes
| Code | When |
|------|------|
| 200 | GET, PATCH success |
| 201 | POST success |
| 204 | DELETE success |
| 400 | Bad request |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 422 | Validation failed |
| 429 | Rate limited |
| 500 | Server error |

## Error Response
```typescript
{ error: { code: "ERROR_CODE", message: "Human message" } }
{ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: { field: ["error"] } } }
```

## Validation
```typescript
import { z } from "zod/v4";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

const parsed = schema.safeParse(req.body);
if (!parsed.success) {
  res.status(422).json({
    error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors }
  });
  return;
}
```

## Rate Limiting
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
});
```
