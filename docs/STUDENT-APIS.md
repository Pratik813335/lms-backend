# Student APIs — cURL Reference

Student APIs cover registration, authentication, profile management, dashboard metrics, learning map, and admin-side student directory operations. Student learning actions (enrollment and lesson completion) are documented in [COURSE-APIS.md](COURSE-APIS.md).

**Base URL:** `http://127.0.0.1:3000` (override with your `HOST` / `PORT` env vars)

**Authentication:**

| Role | Endpoints |
|------|-----------|
| **Public** (no token) | `POST /auth/student/signup`, `POST /auth/login`, `POST /auth/send-otp`, `POST /auth/verify-otp` |
| **Student** (`student_junior`, `student_senior`) | `/student/me/*` profile, dashboard, and learning map |
| **JWT required** | `GET /students`, `POST /admin/students`, `GET /auth/me`, `POST /auth/change-password` |

```bash
export BASE_URL="http://127.0.0.1:3000"
export STUDENT_TOKEN="<your-student-jwt-token>"
export ADMIN_TOKEN="<your-admin-jwt-token>"
```

---

## Registration & Authentication

### POST `/auth/student/signup`

**Why:** Self-service student registration. Validates `gradeLevelId` against master data and automatically assigns `student_junior` or `student_senior` based on the grade level's `category`. Creates a user account, assigns the role, and initializes a student profile with zeroed stats.

```bash
curl -X POST "${BASE_URL}/auth/student/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "StudentPassword123!",
    "fullName": "Jane Doe",
    "gradeLevelId": "<grade-level-id>"
  }'
```

| Field          | Required | Description                                           |
|----------------|----------|-------------------------------------------------------|
| `email`        | Yes      | Student email address                                 |
| `password`     | Yes      | Minimum 8 characters                                  |
| `gradeLevelId` | Yes      | UUID from `GET /masters/grade-levels`                 |
| `fullName`     | No       | Defaults to the email prefix if omitted               |

**Response:** Returns a JWT `token` and `user` profile with assigned roles.

### POST `/auth/login`

**Why:** Authenticates a registered student (or any user) and returns a JWT for subsequent API calls.

```bash
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "StudentPassword123!"
  }'
```

**Response:** `{ "token": "...", "user": { "id", "email", "roles", "fullName", "isOnboarding", ... } }`

### GET `/auth/me`

**Why:** Returns the currently authenticated user's profile from the JWT — useful for session validation and role checks on the frontend.

```bash
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"
```

### POST `/auth/change-password`

**Why:** Lets a student update their password. Admin-created students start with `isOnboarding: true` and the default password `Student@123`; changing the password sets `isOnboarding: false`, completing the first-login onboarding flow.

```bash
curl -X POST "${BASE_URL}/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -d '{
    "oldPassword": "Student@123",
    "newPassword": "MyNewPermanentPassword123!"
  }'
```

| Field         | Required | Description                                      |
|---------------|----------|--------------------------------------------------|
| `oldPassword` | Yes      | Current password                                 |
| `newPassword` | Yes      | Must meet strong password rules                  |

### POST `/auth/send-otp`

**Why:** Sends a 6-digit OTP to a registered user's email for password recovery or email verification. Rate-limited to 5 requests per email.

```bash
curl -X POST "${BASE_URL}/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com"
  }'
```

### POST `/auth/verify-otp`

**Why:** Verifies the OTP code sent via `/auth/send-otp`.

```bash
curl -X POST "${BASE_URL}/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "otp": "123456"
  }'
```

---

## Student Profile (`/student/me`)

All `/student/me` endpoints require a JWT with `student_junior`, `student_senior`, or `admin` role.

### GET `/student/me/dashboard`

**Why:** Powers the student home screen with live metrics — XP, level, streak, GPA, completed lessons, enrolled courses, AI insights, and weekly goal progress. Auto-creates a profile if one doesn't exist yet.

```bash
curl -X GET "${BASE_URL}/student/me/dashboard" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"
```

**Response structure:**

```json
{
  "success": true,
  "data": {
    "profile": {
      "id", "usersId", "fullName", "email",
      "gradeLevelId", "gradeLevel", "tier"
    },
    "stats": {
      "xp", "level", "streakDays", "gpa",
      "completedLessons", "enrolledCoursesCount"
    },
    "aiInsights": "Welcome to LucidPrep! ...",
    "weeklyGoal": {
      "currentHours": 0,
      "targetHours": 6.0
    }
  }
}
```

### GET `/student/me/profile`

**Why:** Returns the full student profile with resolved grade level, tier, name, and email — used on the profile/settings page.

```bash
curl -X GET "${BASE_URL}/student/me/profile" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"
```

### PATCH `/student/me/profile`

**Why:** Allows a student to update their grade level (e.g. after advancing to the next grade).

```bash
curl -X PATCH "${BASE_URL}/student/me/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -d '{
    "gradeLevelId": "<new-grade-level-id>"
  }'
```

| Field          | Required | Description                                   |
|----------------|----------|-----------------------------------------------|
| `gradeLevelId` | No       | UUID from `GET /masters/grade-levels`         |

### GET `/student/me/learning-map`

**Why:** Returns the junior interactive learning node path graph — a visual map of enrolled junior-tier courses with per-node status (`unlocked`, `in_progress`, `completed`, `locked`) and progress percentage.

```bash
curl -X GET "${BASE_URL}/student/me/learning-map" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"
```

**Response structure:**

```json
{
  "success": true,
  "data": {
    "learningMap": {
      "nodes": [
        {
          "id": "<course-id>",
          "nodeIndex": 1,
          "title": "Algebra 101",
          "subject": "Mathematics",
          "emoji": "📐",
          "status": "unlocked",
          "progress": 0
        }
      ],
      "totalNodes": 5,
      "completedNodes": 0
    }
  }
}
```

---

## Admin — Student Directory

### GET `/students`

**Why:** Returns a paginated, filterable directory of all students with profiles, grade levels, enrollment stats, and gamification metrics. Used by the admin Students page.

**Query parameters:**

| Param          | Description                                      |
|----------------|--------------------------------------------------|
| `page`         | Page number (default: `1`)                       |
| `limit`        | Results per page, max 100 (default: `10`)        |
| `tier`         | Filter by `junior` or `senior`                   |
| `gradeLevelId` | Filter by grade level master ID                  |
| `search`       | Search by student name or email                  |

```bash
curl -X GET "${BASE_URL}/students?tier=senior&page=1&limit=10&search=jane" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

**Each student object includes:** `id`, `profileId`, `name`, `email`, `role`, `gradeLevel`, `gradeLevelId`, `tier`, `gpa`, `completedLessons`, `enrolledCoursesCount`, `enrolledCourses`, `xp`, `level`, `streakDays`, `isOnboarding`, `isActive`, `createdAt`.

### POST `/admin/students`

**Why:** Allows an admin to create a student account from the "Add Student" modal — sets up the user, assigns the correct role based on grade tier, creates a profile, optionally enrolls courses, and flags the account for onboarding (`isOnboarding: true` with default password `Student@123`).

```bash
curl -X POST "${BASE_URL}/admin/students" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "fullName": "Carlos Ruiz",
    "email": "carlos@example.com",
    "gradeLevelId": "<grade-level-id>",
    "role": "student_senior",
    "password": "Student@123",
    "gpa": 3.9,
    "completionRate": 0,
    "joinDate": "2026-09-01",
    "enrolledCourses": ["<course-id-1>", "<course-id-2>"]
  }'
```

| Field              | Required | Description                                              |
|--------------------|----------|----------------------------------------------------------|
| `fullName`         | Yes      | Student display name                                     |
| `email`            | Yes      | Unique email address                                     |
| `gradeLevelId`     | Yes      | UUID from `GET /masters/grade-levels`                    |
| `role`             | No       | `student_junior` or `student_senior` — must match grade tier |
| `password`         | No       | Defaults to `Student@123` if omitted                     |
| `gpa`              | No       | Initial GPA (default: `0.0`)                             |
| `completionRate`   | No       | Initial course progress % for enrollments (default: `0`) |
| `joinDate`         | No       | ISO date string for account creation date                |
| `enrolledCourses`  | No       | Array of course UUIDs to auto-enroll                     |

**Role validation:** The `role` must be consistent with the grade level's `category` — a junior grade level cannot be assigned `student_senior` and vice versa. If `role` is omitted, it is inferred from the grade level.

---

## Learning Actions (Course APIs)

These student-facing endpoints live under the course controller but are part of the student learning flow. See [COURSE-APIS.md](COURSE-APIS.md) for full details.

### POST `/courses/{id}/enroll`

**Why:** Enrolls the authenticated student in a course and initializes progress tracking.

```bash
curl -X POST "${BASE_URL}/courses/<course-id>/enroll" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json"
```

### POST `/lessons/{id}/complete`

**Why:** Marks a lesson as completed, awards XP, and recalculates overall course progress.

```bash
curl -X POST "${BASE_URL}/lessons/<lesson-id>/complete" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -H "Content-Type: application/json"
```

---

## End-to-End: Student Onboarding Flow

### Self-registration path

```bash
export BASE_URL="http://127.0.0.1:3000"

# ── 1. Get a grade level ID ─────────────────────────────────────────────
curl -s "${BASE_URL}/masters/grade-levels"   # pick a grade level id
export GRADE_LEVEL_ID="<grade-level-id>"

# ── 2. Register as student ───────────────────────────────────────────────
SIGNUP=$(curl -s -X POST "${BASE_URL}/auth/student/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"student@example.com\",
    \"password\": \"StudentPassword123!\",
    \"fullName\": \"Jane Doe\",
    \"gradeLevelId\": \"${GRADE_LEVEL_ID}\"
  }")

export STUDENT_TOKEN=$(echo "$SIGNUP" | jq -r '.token')

# ── 3. View dashboard ──────────────────────────────────────────────────────
curl -X GET "${BASE_URL}/student/me/dashboard" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"

# ── 4. Enroll in a course ─────────────────────────────────────────────────
curl -X POST "${BASE_URL}/courses/<course-id>/enroll" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"

# ── 5. View learning map (junior students) ────────────────────────────────
curl -X GET "${BASE_URL}/student/me/learning-map" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"
```

### Admin-created student path

```bash
# ── 1. Admin creates student with default password ─────────────────────────
curl -X POST "${BASE_URL}/admin/students" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "fullName": "Carlos Ruiz",
    "email": "carlos@example.com",
    "gradeLevelId": "<grade-level-id>",
    "gpa": 3.9
  }'

# ── 2. Student logs in with default password ───────────────────────────────
LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@example.com",
    "password": "Student@123"
  }')

export STUDENT_TOKEN=$(echo "$LOGIN" | jq -r '.token')
# user.isOnboarding will be true

# ── 3. Student sets a permanent password (completes onboarding) ──────────
curl -X POST "${BASE_URL}/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -d '{
    "oldPassword": "Student@123",
    "newPassword": "MyNewPermanentPassword123!"
  }'
```

---

## Quick Reference

| Method | Endpoint                    | Auth              | Purpose                                    |
|--------|-----------------------------|-------------------|--------------------------------------------|
| POST   | `/auth/student/signup`      | None              | Self-register as student                   |
| POST   | `/auth/login`               | None              | Login and get JWT                          |
| GET    | `/auth/me`                  | JWT               | Get current user profile                   |
| POST   | `/auth/change-password`     | JWT               | Update password & complete onboarding      |
| POST   | `/auth/send-otp`            | None              | Send OTP for email verification            |
| POST   | `/auth/verify-otp`          | None              | Verify OTP code                            |
| GET    | `/student/me/dashboard`     | Student / Admin   | Dashboard metrics & AI insights            |
| GET    | `/student/me/profile`       | Student / Admin   | Full student profile                       |
| PATCH  | `/student/me/profile`       | Student / Admin   | Update grade level                         |
| GET    | `/student/me/learning-map`  | Student / Admin   | Junior learning node path graph            |
| GET    | `/students`                 | JWT               | Paginated student directory (admin)        |
| POST   | `/admin/students`           | JWT               | Admin-create student with onboarding       |
| POST   | `/courses/{id}/enroll`      | Student / Admin   | Enroll in a course                         |
| POST   | `/lessons/{id}/complete`    | Student / Admin   | Complete lesson & earn XP                  |

## Role Mapping

When a student registers or is created by an admin, the role is determined automatically from the grade level's `category`:

| Grade Level `category` | Assigned Role     | Tier     |
|------------------------|-------------------|----------|
| `junior`               | `student_junior`  | `junior` |
| `senior`               | `student_senior`  | `senior` |

Grade levels are managed via the [Master APIs](MASTER-APIS.md).

## Obtaining Tokens

```bash
# Student self-registration (returns token immediately)
curl -X POST "${BASE_URL}/auth/student/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "StudentPassword123!",
    "fullName": "Jane Doe",
    "gradeLevelId": "<grade-level-id>"
  }'

# Or login for an existing account
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "StudentPassword123!"
  }'
```

The `token` field in each response is your `STUDENT_TOKEN`.
