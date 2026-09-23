# Grade Level Management Design

**Date:** 2026-08-26  
**Status:** Approved

## Goal

Admins can list, create, and edit grade levels via a dedicated admin page backed by the LMS masters API.

## API

Base: `masters/grade-levels`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `masters/grade-levels` | List grade levels |
| POST | `masters/grade-levels` | Create |
| PATCH | `masters/grade-levels/:id` | Update |

### Response envelope (observed)

```json
{
  "success": true,
  "message": "Grade levels retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "label": "Class 1",
      "value": "1",
      "description": "Class 1",
      "category": "Junior",
      "isActive": true,
      "isDeleted": false,
      "createdAt": "...",
      "updatedAt": "...",
      "deletedAt": "..."
    }
  ]
}
```

### Create / update payload

- `label` (string, required)
- `value` (string, required)
- `description` (string)
- `category` (string: `Junior` | `Senior`)
- `isActive` (boolean)
- Do **not** send `deletedAt` on create/update from the UI

## Service layer

- Endpoints in `core/api/apiEndpoint.ts`
- Types + `getGradeLevels` / `createGradeLevel` / `updateGradeLevel` in `core/service/adminService.ts`
- Uses existing `apiClient` (auth cookie / Bearer via axios interceptor)

## UI

- Route: `/admin/grade-levels`
- Sidebar (admin): “Grade Levels”
- Pattern: Staff page — header, search, table, create/edit dialog
- Columns: Label, Value, Category, Active, Actions (Edit)
- Active shown as badge; toggleable in form via Select/Switch
- Loading, empty, and error states

## Out of scope (v1)

- Hard delete / soft-delete UI beyond `isActive`
- Other masters entities
