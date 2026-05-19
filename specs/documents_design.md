# Technical Design: Documents & Attachments System

## Overview
Implement a secure system for uploading, storing, and managing documents associated with contacts and companies. This feature will support patient records, contracts, and general files.

## Architecture

### 1. Database Schema
A new table `attachments` will be added to the database to track metadata.

| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary Key |
| filename | text | Generated unique filename (UUID) |
| original_name | text | Original filename from user |
| mime_type | text | Validated MIME type |
| size | integer | File size in bytes |
| entity_type | text | 'contact' or 'company' |
| entity_id | integer | Reference to contact_id or company_id |
| uploaded_by | integer | Reference to user_id |
| created_at | timestamp | Upload date |

### 2. Storage Strategy
- **Provider:** Vercel Blob (Serverless optimized).
- **Access:** `private` access for documents, metadata stored in PostgreSQL.
- **Path Structure:** `attachments/{entity_type}/{entity_id}/{uuid}-{original_name}`.

### 3. API Endpoints
- `POST /api/attachments/upload`: Multipart upload with entity metadata.
- `GET /api/attachments/:id`: Secure file retrieval (streaming with permission check).
- `GET /api/attachments?entityType=X&entityId=Y`: List files for a specific entity.
- `DELETE /api/attachments/:id`: Remove file and metadata.

## Security Measures (Fullstack Guardian 🛡️)

### Backend Protection
- **Input Validation:** Enforce strict file size limits (max 10MB).
- **MIME Type Whitelist:** Only allow safe types (PDF, JPG, PNG, DOCX).
- **Filename Sanitization:** Files are stored as UUIDs; original names are never used in the filesystem to prevent Path Traversal.
- **Authorization:** Before any `GET` or `DELETE`, verify if the authenticated user has permission to access the parent entity (contact/company).
- **Rate Limiting:** Specific rate limit for upload endpoints to prevent disk exhaustion attacks.

### Frontend Protection
- **Client-side Validation:** Check file type and size before sending to API.
- **Secure Previews:** Sanitize URLs for object previews.

## Implementation Plan
1. **Database:** Update Drizzle schema and run migrations.
2. **Backend Utility:** Create a `storage.ts` utility for file operations.
3. **Backend Routes:** Implement Express routes with `multer` for processing uploads.
4. **Frontend Component:** Build a reusable `FileUploader` component using Shadcn UI.
5. **Integration:** Add the documents tab to Contact and Company detail pages.

## Acceptance Criteria
- [ ] Users can upload files up to 10MB.
- [ ] Files are restricted to specific extensions.
- [ ] Files are only accessible to authorized users.
- [ ] Uploaded files appear in the "Documents" tab of the relevant entity.
- [ ] Users can delete their own uploaded documents.
