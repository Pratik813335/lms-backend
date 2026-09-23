# Master APIs — cURL Reference

Master APIs manage shared lookup data used across the LMS (student registration, course creation, filtering, and admin configuration). They live under the `/masters` prefix.

**Base URL:** `http://127.0.0.1:3000` (override with your `HOST` / `PORT` env vars)

**Authentication:**
- `GET` endpoints are **public** — no token required.
- `POST` and `PATCH` endpoints require a valid **admin** JWT in the `Authorization` header.

```bash
export BASE_URL="http://127.0.0.1:3000"
export ADMIN_TOKEN="<your-admin-jwt-token>"
```

---

## Grade Levels

Grade levels define the academic tiers students belong to (e.g. Grade 9, Grade 12). They are required during **student signup** (`/auth/student/signup`) and **admin student creation**, and they drive automatic role assignment (`student_junior` vs `student_senior`) based on the `category` field. Courses are also linked to a grade level for catalog filtering.

### GET `/masters/grade-levels`

**Why:** Populates dropdowns on signup, student profile, and course-creation forms, and lets the frontend list all active grade levels without admin access.

```bash
curl -X GET "${BASE_URL}/masters/grade-levels" \
  -H "Accept: application/json"
```

### POST `/masters/grade-levels`

**Why:** Allows admins to add new grade levels to the system when the curriculum expands (e.g. a new grade band is introduced).

```bash
curl -X POST "${BASE_URL}/masters/grade-levels" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "label": "Grade 12",
    "value": "grade_12",
    "category": "senior",
    "description": "Senior high school — Grade 12"
  }'
```

| Field         | Required | Description                                      |
|---------------|----------|--------------------------------------------------|
| `label`       | Yes      | Display name shown in the UI                     |
| `value`       | Yes      | Unique machine-readable key (used in filters)    |
| `category`    | No       | `"junior"` or `"senior"` — controls student role |
| `description` | No       | Optional notes                                   |
| `isActive`    | No       | Defaults to `true`                               |

### PATCH `/masters/grade-levels/{id}`

**Why:** Lets admins update an existing grade level (rename, change category, deactivate) without breaking foreign-key references elsewhere in the system.

```bash
curl -X PATCH "${BASE_URL}/masters/grade-levels/<grade-level-id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "description": "Updated description for Grade 12",
    "isActive": true
  }'
```

---

## Subjects

Subjects are the academic disciplines courses belong to (e.g. Mathematics, English). Every course **must** reference a valid `subjectId` from this master list.

### GET `/masters/subjects`

**Why:** Supplies the subject picker on course-creation screens and enables subject-based course catalog filtering (`GET /courses?subjectId=...`).

```bash
curl -X GET "${BASE_URL}/masters/subjects" \
  -H "Accept: application/json"
```

### POST `/masters/subjects`

**Why:** Lets admins onboard new subjects when the curriculum adds disciplines not yet in the system.

```bash
curl -X POST "${BASE_URL}/masters/subjects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "label": "Mathematics",
    "value": "mathematics",
    "description": "Core mathematics courses"
  }'
```

| Field         | Required | Description                                   |
|---------------|----------|-----------------------------------------------|
| `label`       | Yes      | Display name shown in the UI                  |
| `value`       | Yes      | Unique machine-readable key                   |
| `description` | No       | Optional notes                                |
| `isActive`    | No       | Defaults to `true`                            |

### PATCH `/masters/subjects/{id}`

**Why:** Allows admins to rename or deactivate a subject while preserving its link to existing courses.

```bash
curl -X PATCH "${BASE_URL}/masters/subjects/<subject-id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "label": "Advanced Mathematics"
  }'
```

---

## Asset Types

Asset types classify learning resources and media (e.g. video, PDF, interactive module). They provide a standardized vocabulary for content tagging and filtering in the LMS.

### GET `/masters/asset-types`

**Why:** Exposes the list of supported asset categories so the frontend can label, filter, and validate uploaded learning materials consistently.

```bash
curl -X GET "${BASE_URL}/masters/asset-types" \
  -H "Accept: application/json"
```

### POST `/masters/asset-types`

**Why:** Lets admins define new asset categories as the platform supports additional content formats.

```bash
curl -X POST "${BASE_URL}/masters/asset-types" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "label": "Video",
    "value": "video",
    "description": "Video-based learning content"
  }'
```

| Field         | Required | Description                                   |
|---------------|----------|-----------------------------------------------|
| `label`       | Yes      | Display name shown in the UI                  |
| `value`       | Yes      | Unique machine-readable key                   |
| `description` | No       | Optional notes                                |
| `isActive`    | No       | Defaults to `true`                            |

### PATCH `/masters/asset-types/{id}`

**Why:** Allows admins to update or retire an asset type without losing historical references.

```bash
curl -X PATCH "${BASE_URL}/masters/asset-types/<asset-type-id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "label": "Interactive Video"
  }'
```

---

## Compliance Statuses

Compliance statuses track regulatory and academic compliance states for students and courses (e.g. NCAA-approved, pending review). Academic coordinators use these to monitor adherence requirements.

### GET `/masters/compliance-statuses`

**Why:** Provides the status options used in compliance dashboards and reporting workflows across the LMS.

```bash
curl -X GET "${BASE_URL}/masters/compliance-statuses" \
  -H "Accept: application/json"
```

### POST `/masters/compliance-statuses`

**Why:** Lets admins add new compliance states as institutional or regulatory requirements evolve.

```bash
curl -X POST "${BASE_URL}/masters/compliance-statuses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "label": "NCAA Approved",
    "value": "ncaa_approved",
    "description": "Course meets NCAA eligibility requirements"
  }'
```

| Field         | Required | Description                                   |
|---------------|----------|-----------------------------------------------|
| `label`       | Yes      | Display name shown in the UI                  |
| `value`       | Yes      | Unique machine-readable key                   |
| `description` | No       | Optional notes                                |
| `isActive`    | No       | Defaults to `true`                            |

### PATCH `/masters/compliance-statuses/{id}`

**Why:** Allows admins to revise compliance status labels or deactivate obsolete statuses.

```bash
curl -X PATCH "${BASE_URL}/masters/compliance-statuses/<compliance-status-id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "description": "Updated NCAA compliance notes"
  }'
```

---

## Quick Reference

| Method | Endpoint                              | Auth   | Purpose                          |
|--------|---------------------------------------|--------|----------------------------------|
| GET    | `/masters/grade-levels`               | None   | List active grade levels         |
| POST   | `/masters/grade-levels`               | Admin  | Create a grade level             |
| PATCH  | `/masters/grade-levels/{id}`          | Admin  | Update a grade level             |
| GET    | `/masters/subjects`                   | None   | List active subjects             |
| POST   | `/masters/subjects`                   | Admin  | Create a subject                 |
| PATCH  | `/masters/subjects/{id}`              | Admin  | Update a subject                 |
| GET    | `/masters/asset-types`                | None   | List active asset types          |
| POST   | `/masters/asset-types`                | Admin  | Create an asset type             |
| PATCH  | `/masters/asset-types/{id}`           | Admin  | Update an asset type             |
| GET    | `/masters/compliance-statuses`        | None   | List active compliance statuses  |
| POST   | `/masters/compliance-statuses`        | Admin  | Create a compliance status       |
| PATCH  | `/masters/compliance-statuses/{id}`   | Admin  | Update a compliance status       |

## Obtaining an Admin Token

Sign up or log in with an admin account to get a JWT:

```bash
# 1. Get the admin role ID
curl -X GET "${BASE_URL}/auth/roles"

# 2. Sign up as admin (or use /auth/login if the account already exists)
curl -X POST "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123!",
    "roleId": "<admin-role-id>",
    "fullName": "System Admin"
  }'
```

The `token` field in the response is your `ADMIN_TOKEN`.
