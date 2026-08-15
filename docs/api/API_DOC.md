> 🚨 路由版本过渡中：本文档描述路径含 /v1 为旧格式，新生产路径去掉 /v1。详见 [API 路径规范与渐进式统一方案](../architecture/api-path-standardization.md)

# TOPEMS Document Service API Documentation

## 1. Service Overview

The Document service provides document management capabilities for the TOPEMS platform, including file upload, storage, version control, and document workflow management.

**Service Name**: `doc`  
**Base Path**: `/api/doc/v1`  
**Authentication**: Bearer Token (JWT)  
**Tenant Isolation**: Multi-tenant support with `tenant_id` header

---

## 2. Endpoints

### 2.1 Document Management

#### 2.1.1 Upload Document

```
POST /api/doc/v1/documents/upload
```

**Description**: Upload a document

**Headers**:
| Name | Value | Required |
|------|-------|----------|
| Authorization | Bearer `token` | Yes |
| X-Tenant-ID | `tenant_id` | Yes |
| Content-Type | multipart/form-data | Yes |

**Request Body** (multipart):
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| file | File | Document file | Yes |
| name | string | Document name | Yes |
| category | string | Document category | No |
| description | string | Document description | No |
| tags | string | Comma-separated tags | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "string",
    "category": "string",
    "file_path": "/documents/tenant1/file.pdf",
    "file_size": 1024000,
    "file_type": "application/pdf",
    "version": "1.0",
    "status": "active",
    "created_by": "string",
    "created_at": "2026-04-15T10:00:00Z"
  }
}
```

#### 2.1.2 List Documents

```
GET /api/doc/v1/documents
```

**Description**: Get document list

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| category | string | Category filter | No |
| keyword | string | Search keyword | No |
| page | number | Page number | No |
| size | number | Page size | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "documents": [
      {
        "id": "string",
        "name": "string",
        "category": "string",
        "file_type": "application/pdf",
        "file_size": 1024000,
        "version": "1.0",
        "status": "active",
        "created_at": "2026-04-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

#### 2.1.3 Get Document

```
GET /api/doc/v1/documents/{id}
```

**Description**: Get document details

**Path Parameters**:
| Name | Type | Description |
|------|------|-------------|
| id | string | Document ID |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "string",
    "category": "string",
    "description": "string",
    "file_path": "/documents/tenant1/file.pdf",
    "file_size": 1024000,
    "file_type": "application/pdf",
    "version": "1.0",
    "status": "active",
    "tags": ["tag1", "tag2"],
    "created_by": "string",
    "created_at": "2026-04-15T10:00:00Z",
    "updated_at": "2026-04-15T10:00:00Z"
  }
}
```

#### 2.1.4 Download Document

```
GET /api/doc/v1/documents/{id}/download
```

**Description**: Download document file

**Path Parameters**:
| Name | Type | Description |
|------|------|-------------|
| id | string | Document ID |

**Response**: File download (application/octet-stream)

#### 2.1.5 Update Document

```
PUT /api/doc/v1/documents/{id}
```

**Description**: Update document metadata

**Request Body**:
```json
{
  "name": "string",
  "category": "string",
  "description": "string",
  "tags": ["tag1", "tag2"]
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "string",
    "category": "string",
    "description": "string",
    "tags": ["tag1", "tag2"]
  }
}
```

#### 2.1.6 Delete Document

```
DELETE /api/doc/v1/documents/{id}
```

**Description**: Delete document

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 2.2 Version Control

#### 2.2.1 Upload New Version

```
POST /api/doc/v1/documents/{id}/versions/upload
```

**Description**: Upload a new version of a document

**Headers**:
| Name | Value | Required |
|------|-------|----------|
| Content-Type | multipart/form-data | Yes |

**Request Body** (multipart):
| Field | Type | Description | Required |
|-------|------|-------------|----------|
| file | File | New version file | Yes |
| version_note | string | Version change note | Yes |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "document_id": "string",
    "version": "2.0",
    "file_path": "/documents/tenant1/file_v2.pdf",
    "version_note": "Updated content",
    "created_by": "string",
    "created_at": "2026-04-15T11:00:00Z"
  }
}
```

#### 2.2.2 Get Version History

```
GET /api/doc/v1/documents/{id}/versions
```

**Description**: Get document version history

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "versions": [
      {
        "id": "string",
        "version": "2.0",
        "file_path": "/documents/tenant1/file_v2.pdf",
        "version_note": "Updated content",
        "created_by": "string",
        "created_at": "2026-04-15T11:00:00Z"
      },
      {
        "id": "string",
        "version": "1.0",
        "file_path": "/documents/tenant1/file.pdf",
        "version_note": "Initial version",
        "created_by": "string",
        "created_at": "2026-04-15T10:00:00Z"
      }
    ]
  }
}
```

#### 2.2.3 Restore Version

```
POST /api/doc/v1/documents/{id}/versions/{version_id}/restore
```

**Description**: Restore a previous version

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "current_version": "1.0"
  }
}
```

### 2.3 Document Categories

#### 2.3.1 Get Categories

```
GET /api/doc/v1/categories
```

**Description**: Get document categories

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "name": "Technical Documents",
      "code": "technical",
      "count": 45
    },
    {
      "id": "string",
      "name": "Financial Documents",
      "code": "financial",
      "count": 32
    },
    {
      "id": "string",
      "name": "HR Documents",
      "code": "hr",
      "count": 28
    }
  ]
}
```

#### 2.3.2 Create Category

```
POST /api/doc/v1/categories
```

**Description**: Create document category

**Request Body**:
```json
{
  "name": "string",
  "code": "string",
  "description": "string"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "string",
    "code": "string",
    "description": "string"
  }
}
```

### 2.4 Document Workflow

#### 2.4.1 Submit for Review

```
POST /api/doc/v1/documents/{id}/submit-review
```

**Description**: Submit document for review

**Request Body**:
```json
{
  "reviewers": ["user_id1", "user_id2"],
  "deadline": "2026-04-20T18:00:00Z",
  "comment": "Please review"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "status": "reviewing",
    "workflow_id": "string"
  }
}
```

#### 2.4.2 Review Document

```
POST /api/doc/v1/documents/{id}/review
```

**Description**: Review a document

**Request Body**:
```json
{
  "action": "approve|reject",
  "comment": "string"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "status": "approved",
    "review_comment": "string"
  }
}
```

---

## 3. Data Models

### 3.1 Document
```typescript
interface Document {
  id: string;
  name: string;
  category: string;
  description: string;
  file_path: string;
  file_size: number;
  file_type: string;
  version: string;
  status: 'active' | 'archived' | 'reviewing' | 'approved';
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

### 3.2 DocumentVersion
```typescript
interface DocumentVersion {
  id: string;
  document_id: string;
  version: string;
  file_path: string;
  version_note: string;
  created_by: string;
  created_at: string;
}
```

### 3.3 DocumentCategory
```typescript
interface DocumentCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  count: number;
}
```

---

## 4. Error Responses

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Authentication failed |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Document not found |
| 409 | CONFLICT | Document already exists |
| 413 | PAYLOAD_TOO_LARGE | File size exceeds limit |
| 500 | INTERNAL_ERROR | Server error |

---

## 5. Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| `/documents/upload` | 10 requests/minute |
| `/documents` | 60 requests/minute |
| `/documents/*/download` | 30 requests/minute |
| `/categories` | 30 requests/minute |