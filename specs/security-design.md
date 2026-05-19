# Feature: Authentication & Security Layer

## Requirements (EARS Format)
While the CRM is deployed, when an unauthenticated request hits any API endpoint, the system shall return 401. While a user is authenticated, when they access a resource, the system shall authorize based on ownership. While a user submits data, the system shall validate input on both client and server.

## Architecture

### [Backend]
- **Auth**: JWT access tokens (15min) + refresh tokens (7d httpOnly cookie)
- **Users table**: id, email, name, password (bcrypt), role, createdAt
- **Endpoints**: POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me
- **Middleware**: requireAuth on all routes except /healthz and /auth/*
- **Rate Limiting**: express-rate-limit (auth: 5/15min, general: 100/15min)
- **Security Headers**: helmet with CSP, HSTS, XSS protection
- **Error Format**: Standardized `{ error: { code, message, details?, requestId?, timestamp? } }`
- **Password**: bcrypt (12 rounds)
- **Input Validation**: Zod schemas on all endpoints (already partially done)

### [Frontend]
- **Auth Context**: React context with user state, login/logout/register methods
- **Token Management**: Access token in memory, refresh via httpOnly cookie
- **Login Page**: /login with email/password form + Zod validation
- **Register Page**: /register with name/email/password form + Zod validation
- **Protected Routes**: Redirect to /login if not authenticated
- **Layout**: Add user avatar + logout button in sidebar

### [Security]
- Auth enforced server-side via middleware (never trust client)
- JWT with RS256 or HS256 + secret rotation
- Refresh token rotation (new refresh token on each use)
- Password hashed with bcrypt (12 rounds)
- Rate limiting on auth endpoints (brute force protection)
- Security headers (CSP prevents XSS, HSTS forces HTTPS)
- Request ID for traceability
- Sensitive fields stripped from user responses (no password)

### [Database]
- `users` table: `id` (serial), `email` (unique), `name`, `password`, `role` (default 'user'), `createdAt`, `updatedAt`

## Implementation Plan
- [ ] Create users table schema
- [ ] Install deps (helmet, express-rate-limit, jsonwebtoken, bcryptjs)
- [ ] Create JWT/utils module
- [ ] Create auth middleware
- [ ] Create auth routes
- [ ] Add helmet, rate limiting, error handler to app.ts
- [ ] Protect existing routes
- [ ] Create frontend auth context/hooks
- [ ] Create login page
- [ ] Create register page
- [ ] Update App.tsx with auth routes and protected routing
