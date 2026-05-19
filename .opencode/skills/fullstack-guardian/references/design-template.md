# Three-Perspective Design

## Design Template

For every feature, address all three layers:

```markdown
## Feature: [Feature Name]

### [Frontend]
- UI components needed
- Client-side validation
- Loading/error states
- Accessibility considerations

### [Backend]
- API endpoints (method, path)
- Request/response schemas
- Database operations
- Business logic

### [Security]
- Authentication requirements
- Authorization rules
- Input sanitization
- Rate limiting
- Audit logging
```

## Technical Design Document

Create `specs/{feature_name}_design.md` with:

```markdown
# Feature: {Name}

## Architecture
- Frontend: [Components, state management]
- Backend: [Endpoints, data models]
- Security: [Auth, validation, protection]

## Implementation Plan
- [ ] Step 1: Create Zod schemas
- [ ] Step 2: Implement API endpoint
- [ ] Step 3: Build UI component
- [ ] Step 4: Add error handling
```

| Layer | Key Concerns |
|-------|--------------|
| Frontend | UX, validation, states, accessibility |
| Backend | API, data, logic, performance |
| Security | Auth, authz, sanitization, logging |
