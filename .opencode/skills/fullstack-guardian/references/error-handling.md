# Error Handling Patterns

## Frontend Error Handling

```typescript
async function handleSubmit(data: FormData) {
  setLoading(true);
  setError(null);
  try {
    const result = await api.updateProfile(data);
    showSuccess('Profile updated');
    return result;
  } catch (error) {
    if (error.status === 401) redirect('/login');
    else if (error.status === 403) showError('Not authorized');
    else if (error.status === 422) setValidationErrors(error.errors);
    else showError('Something went wrong');
  } finally {
    setLoading(false);
  }
}
```

## Backend Error Handling

```typescript
if (user.id !== resource.ownerId) {
  throw new ForbiddenException('Not authorized');
}
try {
  return await service.update(id, data);
} catch (error) {
  if (error instanceof NotFoundError) throw new NotFoundException();
  throw error;
}
```

## Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;           // Machine-readable
    message: string;        // Human-readable
    details?: Record<string, string[]>;  // Field-level errors
  };
}
```

| HTTP | When | Example |
|------|------|---------|
| 400 | Invalid request | Malformed JSON |
| 401 | Not authenticated | Missing token |
| 403 | Not authorized | Wrong permissions |
| 404 | Not found | Resource missing |
| 409 | Conflict | Duplicate email |
| 422 | Validation failed | Invalid input |
| 429 | Rate limited | Too many requests |
| 500 | Server error | Unhandled exception |
