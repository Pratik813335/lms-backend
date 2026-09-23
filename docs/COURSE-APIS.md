# Course APIs — cURL Reference

Course APIs manage the full course lifecycle: catalog browsing, course authoring, curriculum structure (modules & lessons), student enrollment, lesson progress, and media attachments. File uploads are handled separately via the `/files` endpoints and linked to lessons through `mediaId`.

**Base URL:** `http://127.0.0.1:3000` (override with your `HOST` / `PORT` env vars)

**Authentication:**

| Role | Endpoints |
|------|-----------|
| **Public** (no token) | `GET /courses`, `GET /courses/{id}`, `GET /courses/{id}/syllabus`, `GET /files/{filename}`, `GET /media/{id}` |
| **Admin / Content** (`admin`, `content`) | Course, module, and lesson CRUD |
| **Student** (`student_junior`, `student_senior`) | Enrollment and lesson completion |
| **Any authenticated user** | `GET /courses/instructors` |

```bash
export BASE_URL="http://127.0.0.1:3000"
export ADMIN_TOKEN="<your-admin-or-content-jwt-token>"
export STUDENT_TOKEN="<your-student-jwt-token>"
```

---

## Course Catalog & Details

### GET `/courses/instructors`

**Why:** Returns users with the `content` role so admins can assign an instructor when creating or editing a course.

```bash
curl -X GET "${BASE_URL}/courses/instructors" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Accept: application/json"
```

### GET `/courses`

**Why:** Powers the public course catalog with filtering, search, and pagination. Only returns published, active courses.

**Query parameters:**

| Param          | Description                                      |
|----------------|--------------------------------------------------|
| `tier`         | Filter by grade category: `junior` or `senior`   |
| `subjectId`    | Filter by subject master ID                      |
| `gradeLevelId` | Filter by grade level master ID                  |
| `search`       | Search in title, subtitle, and description       |
| `page`         | Page number (default: `1`)                       |
| `limit`        | Results per page, max 50 (default: `12`)         |

```bash
curl -X GET "${BASE_URL}/courses?tier=senior&subjectId=<subject-id>&page=1&limit=12" \
  -H "Accept: application/json"
```

### GET `/courses/{id}`

**Why:** Fetches full course details including resolved subject, grade level, instructor, and author — used on the course detail page.

```bash
curl -X GET "${BASE_URL}/courses/<course-id>" \
  -H "Accept: application/json"
```

### POST `/courses`

**Why:** Creates a new course. Requires valid `subjectId` and `gradeLevelId` from the [master APIs](MASTER-APIS.md). The authenticated user is recorded as the course author.

```bash
curl -X POST "${BASE_URL}/courses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "title": "Algebra 101",
    "subtitle": "Foundations of Equations",
    "description": "Comprehensive algebra course for high school students",
    "subjectId": "<subject-id>",
    "gradeLevelId": "<grade-level-id>",
    "instructorId": "<instructor-user-id>",
    "duration": "18 weeks",
    "credits": 1.0,
    "emoji": "📐",
    "ncaaApproved": true,
    "status": "published"
  }'
```

| Field           | Required | Description                                           |
|-----------------|----------|-------------------------------------------------------|
| `title`         | Yes      | Course title                                          |
| `subjectId`     | Yes      | UUID from `GET /masters/subjects`                     |
| `gradeLevelId`  | Yes      | UUID from `GET /masters/grade-levels`                 |
| `subtitle`      | No       | Short tagline                                         |
| `description`   | No       | Full course description                               |
| `instructorId`  | No       | UUID of a content-role user                           |
| `duration`      | No       | e.g. `"18 weeks"`                                     |
| `credits`       | No       | Defaults to `0.0` (junior) or `1.0` (senior)          |
| `emoji`         | No       | Display icon for the course card                      |
| `ncaaApproved`  | No       | Defaults to `false`                                   |
| `status`        | No       | `draft`, `published`, or `archived` (default: `published`) |

### PATCH `/courses/{id}`

**Why:** Updates course metadata without rebuilding the curriculum tree.

```bash
curl -X PATCH "${BASE_URL}/courses/<course-id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "subtitle": "Updated Algebra Subtitle",
    "status": "published"
  }'
```

### DELETE `/courses/{id}`

**Why:** Soft-deletes a course (sets `isDeleted: true`) so historical enrollment data is preserved.

```bash
curl -X DELETE "${BASE_URL}/courses/<course-id>" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## Curriculum — Modules

Modules are the top-level units within a course (e.g. "Module 1: Equations & Inequalities").

### POST `/courses/{id}/modules`

**Why:** Adds a curriculum module to a course. Modules group related lessons and define the week range.

```bash
curl -X POST "${BASE_URL}/courses/<course-id>/modules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "title": "Module 1: Equations & Inequalities",
    "description": "Linear equations and order of operations",
    "weekRange": "Weeks 1–4",
    "orderIndex": 1
  }'
```

| Field         | Required | Description                          |
|---------------|----------|--------------------------------------|
| `title`       | Yes      | Module title                         |
| `description` | No       | Module overview                      |
| `weekRange`   | No       | e.g. `"Weeks 1–4"`                   |
| `orderIndex`  | No       | Sort order within the course (default: `1`) |

### PATCH `/modules/{id}`

**Why:** Updates module title, description, or ordering after initial creation.

```bash
curl -X PATCH "${BASE_URL}/modules/<module-id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "title": "Module 1: Linear Equations (Revised)",
    "orderIndex": 1
  }'
```

### DELETE `/modules/{id}`

**Why:** Soft-deletes a module from the curriculum.

```bash
curl -X DELETE "${BASE_URL}/modules/<module-id>" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## Curriculum — Lessons

Lessons are the individual learning units inside a module. They can reference uploaded media via `mediaId` or an external URL.

### POST `/modules/{id}/lessons`

**Why:** Creates a lesson within a module. Attach a previously uploaded file by passing its `mediaId` from `POST /files`.

```bash
curl -X POST "${BASE_URL}/modules/<module-id>/lessons" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "title": "Order of Operations (PEMDAS)",
    "type": "video",
    "duration": "2 min",
    "mediaId": "<media-id-from-upload>",
    "externalUrl": "https://www.youtube.com/watch?v=example",
    "orderIndex": 1,
    "xpReward": 50
  }'
```

| Field         | Required | Description                                              |
|---------------|----------|----------------------------------------------------------|
| `title`       | Yes      | Lesson title                                             |
| `type`        | No       | `video`, `warmup`, `reading`, or `assessment` (default: `video`) |
| `duration`    | No       | e.g. `"2 min"`                                           |
| `mediaId`     | No       | UUID from `POST /files` — links uploaded file to lesson  |
| `externalUrl` | No       | Fallback external link (e.g. YouTube)                    |
| `orderIndex`  | No       | Sort order within the module (default: `1`)              |
| `xpReward`    | No       | XP points on completion (default: `50`)                  |

### PATCH `/lessons/{id}`

**Why:** Updates lesson content or swaps the attached media file.

```bash
curl -X PATCH "${BASE_URL}/lessons/<lesson-id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "title": "Order of Operations — Updated",
    "mediaId": "<new-media-id>"
  }'
```

### DELETE `/lessons/{id}`

**Why:** Soft-deletes a lesson from the curriculum.

```bash
curl -X DELETE "${BASE_URL}/lessons/<lesson-id>" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

---

## Syllabus Tree

### GET `/courses/{id}/syllabus`

**Why:** Returns the full ordered curriculum tree (modules → lessons) with per-lesson progress status (`done`, `current`, `locked`) when a `userId` is provided.

```bash
# Without progress tracking
curl -X GET "${BASE_URL}/courses/<course-id>/syllabus" \
  -H "Accept: application/json"

# With student progress overlay
curl -X GET "${BASE_URL}/courses/<course-id>/syllabus?userId=<student-user-id>" \
  -H "Accept: application/json"
```

---

## Enrollment & Progress

### POST `/courses/{id}/enroll`

**Why:** Enrolls the authenticated student in a course and initializes their progress tracking.

```bash
curl -X POST "${BASE_URL}/courses/<course-id>/enroll" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json"
```

### POST `/lessons/{id}/complete`

**Why:** Marks a lesson as completed for the authenticated student, awards XP, and recalculates course progress percentage.

```bash
curl -X POST "${BASE_URL}/lessons/<lesson-id>/complete" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response includes:** `xpAwarded`, `progressRate` (0–100).

---

## File Upload — How It Works

Course content files (videos, PDFs, images) are **not** uploaded directly to course endpoints. Instead, the LMS uses a two-step flow:

```
1. Upload file  →  POST /files          →  returns mediaId + fileUrl
2. Link to lesson → POST /modules/{id}/lessons  →  pass mediaId in body
```

### Storage

| Setting | Default | Description |
|---------|---------|-------------|
| `STORAGE_DIRECTORY` | `.sandbox/storage` | Local disk path where uploaded files are saved |
| `API_ENDPOINT` | `http://127.0.0.1:3000` | Base URL used to build public `fileUrl` values |
| `HOST` / `PORT` | `127.0.0.1` / `3000` | Fallback if `API_ENDPOINT` is not set |

Files are stored on disk with a timestamped, sanitized filename (e.g. `20260902T013000000Z_lesson_video.mp4`). A corresponding record is created in the PostgreSQL `media` table with metadata (`fileName`, `fileUrl`, `fileType`, `fileSize`, etc.).

When a lesson references a `mediaId`, the media record is marked `isUsed: true`.

### POST `/files`

**Why:** Uploads one or more files and registers them as media entities. Returns the `id` (mediaId) needed when creating lessons. **No authentication required.**

```bash
curl -X POST "${BASE_URL}/files" \
  -F "file=@/path/to/lesson_video.mp4"
```

**Multiple files** can be uploaded in a single request by repeating the `-F` flag:

```bash
curl -X POST "${BASE_URL}/files" \
  -F "file=@/path/to/lesson_video.mp4" \
  -F "file=@/path/to/worksheet.pdf"
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "a1b2c3d4-...",
        "fileUrl": "http://127.0.0.1:3000/files/20260902T013000000Z_lesson_video.mp4",
        "fileName": "20260902T013000000Z_lesson_video.mp4",
        "fileOriginalName": "lesson_video.mp4",
        "fileType": "video/mp4",
        "fileSize": 1048576
      }
    ]
  },
  "message": "Files uploaded and registered successfully"
}
```

Save the `id` from the response — that is your `mediaId`.

### GET `/files/{filename}`

**Why:** Serves the raw uploaded file with the correct MIME type. Used by the frontend to stream or download lesson content.

```bash
curl -X GET "${BASE_URL}/files/20260902T013000000Z_lesson_video.mp4" \
  -o downloaded_video.mp4
```

### GET `/media/{id}`

**Why:** Retrieves media metadata (URL, type, size, original name) by database ID without downloading the file itself.

```bash
curl -X GET "${BASE_URL}/media/<media-id>" \
  -H "Accept: application/json"
```

---

## End-to-End: Create a Course with a Video Lesson

This walkthrough ties together master data, file upload, and course APIs.

```bash
# ── 0. Set tokens and base URL ──────────────────────────────────────────
export BASE_URL="http://127.0.0.1:3000"
export ADMIN_TOKEN="<your-admin-jwt-token>"

# ── 1. Get master data IDs ───────────────────────────────────────────────
curl -s "${BASE_URL}/masters/subjects"       # pick a subject id
curl -s "${BASE_URL}/masters/grade-levels"   # pick a grade level id

export SUBJECT_ID="<subject-id>"
export GRADE_LEVEL_ID="<grade-level-id>"

# ── 2. Create the course ─────────────────────────────────────────────────
COURSE_ID=$(curl -s -X POST "${BASE_URL}/courses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d "{
    \"title\": \"Algebra 101\",
    \"subjectId\": \"${SUBJECT_ID}\",
    \"gradeLevelId\": \"${GRADE_LEVEL_ID}\",
    \"status\": \"published\"
  }" | jq -r '.data.id')

# ── 3. Add a module ──────────────────────────────────────────────────────
MODULE_ID=$(curl -s -X POST "${BASE_URL}/courses/${COURSE_ID}/modules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "title": "Module 1: Equations",
    "orderIndex": 1
  }' | jq -r '.data.id')

# ── 4. Upload lesson video ─────────────────────────────────────────────────
MEDIA_ID=$(curl -s -X POST "${BASE_URL}/files" \
  -F "file=@/path/to/lesson_video.mp4" \
  | jq -r '.data.files[0].id')

# ── 5. Create lesson linked to uploaded media ─────────────────────────────
curl -X POST "${BASE_URL}/modules/${MODULE_ID}/lessons" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d "{
    \"title\": \"Introduction to Equations\",
    \"type\": \"video\",
    \"mediaId\": \"${MEDIA_ID}\",
    \"orderIndex\": 1,
    \"xpReward\": 50
  }"

# ── 6. Verify syllabus tree ───────────────────────────────────────────────
curl -X GET "${BASE_URL}/courses/${COURSE_ID}/syllabus"
```

---

## Quick Reference

| Method | Endpoint                        | Auth              | Purpose                              |
|--------|---------------------------------|-------------------|--------------------------------------|
| GET    | `/courses/instructors`          | JWT               | List content-role instructors        |
| GET    | `/courses`                      | None              | Browse & filter course catalog       |
| POST   | `/courses`                      | Admin / Content   | Create a course                      |
| GET    | `/courses/{id}`                 | None              | Get course details                   |
| PATCH  | `/courses/{id}`                 | Admin / Content   | Update course metadata               |
| DELETE | `/courses/{id}`                 | Admin / Content   | Soft-delete a course                 |
| POST   | `/courses/{id}/modules`         | Admin / Content   | Add a module to a course             |
| PATCH  | `/modules/{id}`                 | Admin / Content   | Update a module                      |
| DELETE | `/modules/{id}`                 | Admin / Content   | Soft-delete a module                 |
| POST   | `/modules/{id}/lessons`         | Admin / Content   | Add a lesson (optionally with media) |
| PATCH  | `/lessons/{id}`                 | Admin / Content   | Update a lesson                      |
| DELETE | `/lessons/{id}`                 | Admin / Content   | Soft-delete a lesson                 |
| GET    | `/courses/{id}/syllabus`        | None              | Get full curriculum tree             |
| POST   | `/courses/{id}/enroll`          | Student / Admin   | Enroll in a course                   |
| POST   | `/lessons/{id}/complete`        | Student / Admin   | Mark lesson complete & award XP      |
| POST   | `/files`                        | None              | Upload file & register media         |
| GET    | `/files/{filename}`             | None              | Download / stream uploaded file      |
| GET    | `/media/{id}`                   | None              | Get media metadata by ID             |

## Obtaining Tokens

```bash
# Admin / Content token
curl -X POST "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "content@example.com",
    "password": "ContentPassword123!",
    "roleId": "<content-role-id>",
    "fullName": "Content Author"
  }'

# Student token (requires a valid gradeLevelId from master data)
curl -X POST "${BASE_URL}/auth/student/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "StudentPassword123!",
    "fullName": "Test Student",
    "gradeLevelId": "<grade-level-id>"
  }'
```

The `token` field in each response is your JWT.
