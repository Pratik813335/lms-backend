# LMS Backend API Endpoints

Base URL: `http://127.0.0.1:3000`

Authenticated routes expect:

```http
Authorization: Bearer <token>
```

Get `<token>` from `POST /auth/login` or a signup response. Roles used below: `admin`, `content`, `academic`, `operations`, `student_junior`, `student_senior`.

Most JSON responses use `{ "success": true, "message": "...", "data": ... }`. Login, signup, OTP, `/auth/me`, `/auth/roles`, and `/ping` return their own shapes.

OpenAPI explorer: `http://127.0.0.1:3000/explorer`

---

## Health

### GET /ping

**Auth:** Public

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/ping
```

**2) Use case**

Check that the server is up. Returns a greeting, the current time, the request URL, and request headers.

**3) Example API call**

```http
GET /ping
```

---

## Authentication and users

### POST /auth/login

**Auth:** Public

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@lucidprep.com","password":"Password1!"}'
```

**2) Use case**

Sign in with email and password and receive a JWT plus the user profile.

**3) Example API call**

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@lucidprep.com",
  "password": "Password1!"
}
```

### POST /auth/student/signup

**Auth:** Public

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/auth/student/signup \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "student@example.com",
    "password": "password12",
    "fullName": "Ava Student",
    "gradeLevelId": "GRADE_LEVEL_UUID"
  }'
```

**2) Use case**

Register a student. `gradeLevelId` must be an active grade level. A junior grade assigns `student_junior`; any other category assigns `student_senior`. Password must be at least 8 characters. Returns a JWT.

**3) Example API call**

```http
POST /auth/student/signup
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password12",
  "fullName": "Ava Student",
  "gradeLevelId": "GRADE_LEVEL_UUID"
}
```

### POST /auth/signup

**Auth:** Public

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "staff@example.com",
    "password": "password12",
    "fullName": "Jordan Staff",
    "roleId": "ROLE_UUID"
  }'
```

**2) Use case**

Register a staff or admin user with an explicit `roleId` from `GET /auth/roles`. Student roles are rejected; those accounts use `/auth/student/signup`. Password must be at least 8 characters.

**3) Example API call**

```http
POST /auth/signup
Content-Type: application/json

{
  "email": "staff@example.com",
  "password": "password12",
  "fullName": "Jordan Staff",
  "roleId": "ROLE_UUID"
}
```

### POST /auth/send-otp

**Auth:** Public

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.com"}'
```

**2) Use case**

Email a 6-digit OTP to the given address. Requires SMTP to be configured.

**3) Example API call**

```http
POST /auth/send-otp
Content-Type: application/json

{
  "email": "student@example.com"
}
```

### POST /auth/verify-otp

**Auth:** Public

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.com","otp":"123456"}'
```

**2) Use case**

Confirm a previously sent email OTP.

**3) Example API call**

```http
POST /auth/verify-otp
Content-Type: application/json

{
  "email": "student@example.com",
  "otp": "123456"
}
```

### GET /auth/me

**Auth:** JWT

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Return the profile stored in the current JWT (id, email, roles, full name).

**3) Example API call**

```http
GET /auth/me
Authorization: Bearer <token>
```

### GET /auth/roles

**Auth:** Public

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/auth/roles
```

**2) Use case**

List active system roles (`key`, `label`, `description`) so a staff signup can pick a `roleId`.

**3) Example API call**

```http
GET /auth/roles
```

### POST /auth/change-password

**Auth:** JWT

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"oldPassword":"Password1!","newPassword":"NewPassword1!"}'
```

**2) Use case**

Change the signed-in user's password. The new password must be at least 8 characters and include uppercase, lowercase, a digit, and a special character. Clears the onboarding flag.

**3) Example API call**

```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "oldPassword": "Password1!",
  "newPassword": "NewPassword1!"
}
```

### GET /users

**Auth:** JWT

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/users?page=1&limit=10&role=content&search=jordan&isActive=true" \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Paginated directory of staff users with roles `content`, `academic`, or `operations`. Admins and students are excluded. Optional filters: `role`, `search` (name or email), `isActive`. `page` defaults to 1, `limit` defaults to 10 (max 100).

**3) Example API call**

```http
GET /users?page=1&limit=10&role=content&search=jordan&isActive=true
Authorization: Bearer <token>
```

### PATCH /admin/users/{id}

**Auth:** JWT, role `admin`

**1) Curl command**

```bash
curl -s -X PATCH http://127.0.0.1:3000/admin/users/USER_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Jordan Lee","phone":"+15551212","roleId":"ROLE_UUID","isActive":true}'
```

**2) Use case**

Update a staff member's name, phone, active flag, and optionally replace their role.

**3) Example API call**

```http
PATCH /admin/users/USER_UUID
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Jordan Lee",
  "phone": "+15551212",
  "roleId": "ROLE_UUID",
  "isActive": true
}
```

### DELETE /admin/users/{id}

**Auth:** JWT, role `admin`

**1) Curl command**

```bash
curl -s -X DELETE http://127.0.0.1:3000/admin/users/USER_UUID \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Soft-delete a staff user (`isDeleted: true`, `isActive: false`).

**3) Example API call**

```http
DELETE /admin/users/USER_UUID
Authorization: Bearer <token>
```

---

## Master data

Create and update routes require JWT and role `admin`. List routes are public and return only active, non-deleted rows.

### GET /masters/grade-levels

**Auth:** Public

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/masters/grade-levels?category=junior&hasTestPrep=true&hasFullCurriculum=false"
```

**2) Use case**

List grade levels for signup, course filters, and admin forms. Optional query: `category`, `hasTestPrep`, `hasFullCurriculum`.

**3) Example API call**

```http
GET /masters/grade-levels?category=junior&hasTestPrep=true
```

### POST /masters/grade-levels

**Auth:** JWT, role `admin`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/masters/grade-levels \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "label": "Grade 7",
    "value": "grade_7",
    "description": "Seventh grade",
    "category": "junior",
    "hasTestPrep": true,
    "hasFullCurriculum": false,
    "isActive": true
  }'
```

**2) Use case**

Add a grade level. `label` and `value` are required. `category` is `junior` or `senior` and drives student role assignment.

**3) Example API call**

```http
POST /masters/grade-levels
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Grade 7",
  "value": "grade_7",
  "description": "Seventh grade",
  "category": "junior",
  "hasTestPrep": true,
  "hasFullCurriculum": false,
  "isActive": true
}
```

### PATCH /masters/grade-levels/{id}

**Auth:** JWT, role `admin`

**1) Curl command**

```bash
curl -s -X PATCH http://127.0.0.1:3000/masters/grade-levels/GRADE_LEVEL_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"label":"Grade 7","hasTestPrep":true}'
```

**2) Use case**

Update any grade-level field except `id` and timestamps.

**3) Example API call**

```http
PATCH /masters/grade-levels/GRADE_LEVEL_UUID
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Grade 7",
  "hasTestPrep": true
}
```

### GET /masters/subjects

**Auth:** Public

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/masters/subjects?isTestPrep=true"
```

**2) Use case**

List subjects. Optional `isTestPrep=true` returns only test-prep subjects.

**3) Example API call**

```http
GET /masters/subjects?isTestPrep=false
```

### POST /masters/subjects

**Auth:** JWT, role `admin`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/masters/subjects \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"label":"Algebra","value":"algebra","description":"Algebra I","isTestPrep":false,"isActive":true}'
```

**2) Use case**

Add a subject. `label` and `value` are required.

**3) Example API call**

```http
POST /masters/subjects
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Algebra",
  "value": "algebra",
  "description": "Algebra I",
  "isTestPrep": false,
  "isActive": true
}
```

### PATCH /masters/subjects/{id}

**Auth:** JWT, role `admin`

**1) Curl command**

```bash
curl -s -X PATCH http://127.0.0.1:3000/masters/subjects/SUBJECT_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"label":"Algebra I","isActive":true}'
```

**2) Use case**

Update a subject.

**3) Example API call**

```http
PATCH /masters/subjects/SUBJECT_UUID
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Algebra I",
  "isActive": true
}
```

### GET /masters/asset-types

**Auth:** Public

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/masters/asset-types
```

**2) Use case**

List media and content asset types (video, PDF, and so on).

**3) Example API call**

```http
GET /masters/asset-types
```

### POST /masters/asset-types

**Auth:** JWT, role `admin`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/masters/asset-types \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"label":"Video","value":"video","description":"Lesson video","isActive":true}'
```

**2) Use case**

Add an asset type. `label` and `value` are required.

**3) Example API call**

```http
POST /masters/asset-types
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Video",
  "value": "video",
  "description": "Lesson video",
  "isActive": true
}
```

### PATCH /masters/asset-types/{id}

**Auth:** JWT, role `admin`

**1) Curl command**

```bash
curl -s -X PATCH http://127.0.0.1:3000/masters/asset-types/ASSET_TYPE_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"description":"Uploaded lesson video"}'
```

**2) Use case**

Update an asset type.

**3) Example API call**

```http
PATCH /masters/asset-types/ASSET_TYPE_UUID
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Uploaded lesson video"
}
```

### GET /masters/compliance-statuses

**Auth:** Public

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/masters/compliance-statuses
```

**2) Use case**

List compliance status values used by academic audits.

**3) Example API call**

```http
GET /masters/compliance-statuses
```

### POST /masters/compliance-statuses

**Auth:** JWT, role `admin`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/masters/compliance-statuses \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"label":"Approved","value":"approved","description":"Course passed audit","isActive":true}'
```

**2) Use case**

Add a compliance status. `label` and `value` are required.

**3) Example API call**

```http
POST /masters/compliance-statuses
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Approved",
  "value": "approved",
  "description": "Course passed audit",
  "isActive": true
}
```

### PATCH /masters/compliance-statuses/{id}

**Auth:** JWT, role `admin`

**1) Curl command**

```bash
curl -s -X PATCH http://127.0.0.1:3000/masters/compliance-statuses/STATUS_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"label":"Conditionally approved"}'
```

**2) Use case**

Update a compliance status.

**3) Example API call**

```http
PATCH /masters/compliance-statuses/STATUS_UUID
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Conditionally approved"
}
```

---

## Students

### GET /student/me/dashboard

**Auth:** JWT, roles `student_junior`, `student_senior`, or `admin`

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/student/me/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Load the signed-in student's dashboard: grade, XP, level, streak, GPA, lesson count, enrollments, AI insight, and weekly goal. Creates a profile if one does not exist.

**3) Example API call**

```http
GET /student/me/dashboard
Authorization: Bearer <token>
```

### GET /student/me/profile

**Auth:** JWT, roles `student_junior`, `student_senior`, or `admin`

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/student/me/profile \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Fetch the signed-in student's profile, including grade level and name.

**3) Example API call**

```http
GET /student/me/profile
Authorization: Bearer <token>
```

### PATCH /student/me/profile

**Auth:** JWT, roles `student_junior`, `student_senior`, or `admin`

**1) Curl command**

```bash
curl -s -X PATCH http://127.0.0.1:3000/student/me/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"gradeLevelId":"GRADE_LEVEL_UUID"}'
```

**2) Use case**

Change the signed-in student's grade level. `gradeLevelId` must be an active grade level.

**3) Example API call**

```http
PATCH /student/me/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "gradeLevelId": "GRADE_LEVEL_UUID"
}
```

### GET /student/me/learning-map

**Auth:** JWT, roles `student_junior`, `student_senior`, or `admin`

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/student/me/learning-map \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Return the junior learning-path graph for the signed-in student.

**3) Example API call**

```http
GET /student/me/learning-map
Authorization: Bearer <token>
```

### GET /students

**Auth:** JWT

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/students?page=1&limit=10&tier=junior&gradeLevelId=GRADE_LEVEL_UUID&search=ava" \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Paginated student directory with profile stats and enrolled course ids. Optional filters: `tier` (`junior` or `senior`), `gradeLevelId`, `search` (name or email).

**3) Example API call**

```http
GET /students?page=1&limit=10&tier=junior&search=ava
Authorization: Bearer <token>
```

### POST /admin/students

**Auth:** JWT

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/admin/students \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "Ava Student",
    "email": "ava@example.com",
    "gradeLevelId": "GRADE_LEVEL_UUID",
    "password": "Student@123",
    "gpa": 3.5,
    "completionRate": 0,
    "joinDate": "2026-10-01",
    "enrolledCourses": ["COURSE_UUID"]
  }'
```

**2) Use case**

Create a student from the admin directory, assign the role that matches the grade tier, and optionally enroll them in courses. Required: `fullName`, `email`, `gradeLevelId`. If `password` is omitted or is `Student123` / `Student@123`, the account uses `Student@123` and `isOnboarding` is true. A custom password must meet the strong-password rules. `role`, if sent, must match the grade's junior or senior tier.

**3) Example API call**

```http
POST /admin/students
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Ava Student",
  "email": "ava@example.com",
  "gradeLevelId": "GRADE_LEVEL_UUID",
  "password": "Student@123",
  "gpa": 3.5,
  "completionRate": 0,
  "joinDate": "2026-10-01",
  "enrolledCourses": ["COURSE_UUID"]
}
```

### PATCH /admin/students/{id}

**Auth:** JWT, roles `admin`, `academic`, or `operations`

**1) Curl command**

```bash
curl -s -X PATCH http://127.0.0.1:3000/admin/students/USER_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ava S.","gradeLevelId":"GRADE_LEVEL_UUID","gpa":3.8,"isActive":true}'
```

**2) Use case**

Update a student's name, grade level, GPA, or active flag. `{id}` is the user id.

**3) Example API call**

```http
PATCH /admin/students/USER_UUID
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Ava S.",
  "gradeLevelId": "GRADE_LEVEL_UUID",
  "gpa": 3.8,
  "isActive": true
}
```

### DELETE /admin/students/{id}

**Auth:** JWT, roles `admin` or `operations`

**1) Curl command**

```bash
curl -s -X DELETE http://127.0.0.1:3000/admin/students/USER_UUID \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Soft-delete a student user and their profile.

**3) Example API call**

```http
DELETE /admin/students/USER_UUID
Authorization: Bearer <token>
```

---

## Courses, modules, and lessons

### GET /courses/instructors

**Auth:** JWT

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/courses/instructors \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

List users who can be assigned as course instructors (dropdown).

**3) Example API call**

```http
GET /courses/instructors
Authorization: Bearer <token>
```

### GET /courses

**Auth:** Public

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/courses?tier=senior&subjectId=SUBJECT_UUID&gradeLevelId=GRADE_LEVEL_UUID&status=published&search=algebra&page=1&limit=10"
```

**2) Use case**

Browse the course catalog. Optional filters: `tier`, `subjectId`, `gradeLevelId`, `status` (`draft`, `published`, `archived`), `search`, `page`, `limit`.

**3) Example API call**

```http
GET /courses?status=published&search=algebra&page=1&limit=10
```

### POST /courses

**Auth:** JWT, roles `admin` or `content`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/courses \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Algebra I",
    "subtitle": "Linear equations",
    "description": "Full-year algebra course",
    "subjectId": "SUBJECT_UUID",
    "gradeLevelId": "GRADE_LEVEL_UUID",
    "instructorId": "USER_UUID",
    "duration": "36 weeks",
    "credits": 1,
    "emoji": "📐",
    "ncaaApproved": false,
    "status": "draft"
  }'
```

**2) Use case**

Create a course. Required: `title`, `subjectId`, `gradeLevelId`. `status` is `draft`, `published`, or `archived` (default `published`). Credits default to 0 for junior grades and 1 for senior grades.

**3) Example API call**

```http
POST /courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Algebra I",
  "subtitle": "Linear equations",
  "description": "Full-year algebra course",
  "subjectId": "SUBJECT_UUID",
  "gradeLevelId": "GRADE_LEVEL_UUID",
  "instructorId": "USER_UUID",
  "duration": "36 weeks",
  "credits": 1,
  "emoji": "📐",
  "ncaaApproved": false,
  "status": "draft"
}
```

### GET /courses/{id}

**Auth:** Public

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/courses/COURSE_UUID
```

**2) Use case**

Fetch one course with subject, grade level, instructor, and author.

**3) Example API call**

```http
GET /courses/COURSE_UUID
```

### PATCH /courses/{id}

**Auth:** JWT, roles `admin` or `content`

**1) Curl command**

```bash
curl -s -X PATCH http://127.0.0.1:3000/courses/COURSE_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Algebra I Honors","status":"published","ncaaApproved":true}'
```

**2) Use case**

Update course fields. Same fields as create, all optional.

**3) Example API call**

```http
PATCH /courses/COURSE_UUID
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Algebra I Honors",
  "status": "published",
  "ncaaApproved": true
}
```

### DELETE /courses/{id}

**Auth:** JWT, roles `admin` or `content`

**1) Curl command**

```bash
curl -s -X DELETE http://127.0.0.1:3000/courses/COURSE_UUID \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Soft-delete a course.

**3) Example API call**

```http
DELETE /courses/COURSE_UUID
Authorization: Bearer <token>
```

### POST /courses/{id}/modules

**Auth:** JWT, roles `admin` or `content`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/courses/COURSE_UUID/modules \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Equations","description":"Linear equations","weekRange":"Weeks 1-4","orderIndex":1}'
```

**2) Use case**

Add a curriculum module to a course. `title` is required.

**3) Example API call**

```http
POST /courses/COURSE_UUID/modules
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Equations",
  "description": "Linear equations",
  "weekRange": "Weeks 1-4",
  "orderIndex": 1
}
```

### PATCH /modules/{id}

**Auth:** JWT, roles `admin` or `content`

**1) Curl command**

```bash
curl -s -X PATCH http://127.0.0.1:3000/modules/MODULE_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Equations and Inequalities","orderIndex":2}'
```

**2) Use case**

Update a module's title, description, week range, or order.

**3) Example API call**

```http
PATCH /modules/MODULE_UUID
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Equations and Inequalities",
  "orderIndex": 2
}
```

### DELETE /modules/{id}

**Auth:** JWT, roles `admin` or `content`

**1) Curl command**

```bash
curl -s -X DELETE http://127.0.0.1:3000/modules/MODULE_UUID \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Soft-delete a module.

**3) Example API call**

```http
DELETE /modules/MODULE_UUID
Authorization: Bearer <token>
```

### POST /modules/{id}/lessons

**Auth:** JWT, roles `admin` or `content`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/modules/MODULE_UUID/lessons \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Order of Operations",
    "type": "video",
    "duration": "12 min",
    "mediaId": "MEDIA_UUID",
    "externalUrl": "https://www.youtube.com/watch?v=example",
    "orderIndex": 1,
    "xpReward": 50
  }'
```

**2) Use case**

Add a lesson to a module. `title` is required. `type` is `video`, `warmup`, `reading`, or `assessment`. If `mediaId` is set, it must be an active media row from `POST /files`; that file is marked used. The response includes the `media` relation.

**3) Example API call**

```http
POST /modules/MODULE_UUID/lessons
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Order of Operations",
  "type": "video",
  "duration": "12 min",
  "mediaId": "MEDIA_UUID",
  "externalUrl": "https://www.youtube.com/watch?v=example",
  "content": { "body": "Optional structured lesson content" },
  "orderIndex": 1,
  "xpReward": 50
}
```

### PATCH /lessons/{id}

**Auth:** JWT, roles `admin` or `content`

**1) Curl command**

```bash
curl -s -X PATCH http://127.0.0.1:3000/lessons/LESSON_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"PEMDAS","xpReward":75}'
```

**2) Use case**

Update a lesson. A new `mediaId` is validated and marked used.

**3) Example API call**

```http
PATCH /lessons/LESSON_UUID
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "PEMDAS",
  "xpReward": 75
}
```

### DELETE /lessons/{id}

**Auth:** JWT, roles `admin` or `content`

**1) Curl command**

```bash
curl -s -X DELETE http://127.0.0.1:3000/lessons/LESSON_UUID \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Soft-delete a lesson.

**3) Example API call**

```http
DELETE /lessons/LESSON_UUID
Authorization: Bearer <token>
```

### GET /courses/{id}/syllabus

**Auth:** Public

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/courses/COURSE_UUID/syllabus?userId=USER_UUID"
```

**2) Use case**

Return the course syllabus tree (modules and lessons). Optional `userId` includes that student's progress.

**3) Example API call**

```http
GET /courses/COURSE_UUID/syllabus?userId=USER_UUID
```

### POST /courses/{id}/instructors/assign

**Auth:** JWT, roles `admin`, `content`, or `academic`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/courses/COURSE_UUID/instructors/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"instructorId":"USER_UUID"}'
```

**2) Use case**

Assign an instructor to a course.

**3) Example API call**

```http
POST /courses/COURSE_UUID/instructors/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "instructorId": "USER_UUID"
}
```

### POST /courses/{id}/students/batch-enroll

**Auth:** JWT, roles `admin`, `content`, or `academic`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/courses/COURSE_UUID/students/batch-enroll \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"studentUserIds":["USER_UUID"],"learningMode":"credit"}'
```

**2) Use case**

Enroll many students at once. `learningMode` is `credit` or `revision`.

**3) Example API call**

```http
POST /courses/COURSE_UUID/students/batch-enroll
Authorization: Bearer <token>
Content-Type: application/json

{
  "studentUserIds": ["USER_UUID"],
  "learningMode": "credit"
}
```

### GET /courses/{id}/roster

**Auth:** JWT, roles `admin`, `content`, `academic`, or `operations`

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/courses/COURSE_UUID/roster \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

List students enrolled in a course.

**3) Example API call**

```http
GET /courses/COURSE_UUID/roster
Authorization: Bearer <token>
```

### POST /courses/{id}/enroll

**Auth:** JWT, roles `student_junior`, `student_senior`, or `admin`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/courses/COURSE_UUID/enroll \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Enroll the signed-in user in the course.

**3) Example API call**

```http
POST /courses/COURSE_UUID/enroll
Authorization: Bearer <token>
```

### DELETE /courses/{id}/enroll

**Auth:** JWT, roles `admin`, `content`, or `academic`

**1) Curl command**

```bash
curl -s -X DELETE "http://127.0.0.1:3000/courses/COURSE_UUID/enroll?userId=USER_UUID" \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Staff unenrolls a specific student. `userId` is required.

**3) Example API call**

```http
DELETE /courses/COURSE_UUID/enroll?userId=USER_UUID
Authorization: Bearer <token>
```

### DELETE /student/me/courses/{id}/enroll

**Auth:** JWT, roles `student_junior`, `student_senior`, or `admin`

**1) Curl command**

```bash
curl -s -X DELETE http://127.0.0.1:3000/student/me/courses/COURSE_UUID/enroll \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

The signed-in student drops a course.

**3) Example API call**

```http
DELETE /student/me/courses/COURSE_UUID/enroll
Authorization: Bearer <token>
```

### POST /lessons/{id}/complete

**Auth:** JWT, roles `student_junior`, `student_senior`, or `admin`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/lessons/LESSON_UUID/complete \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Mark a lesson complete for the signed-in student and update XP and progress.

**3) Example API call**

```http
POST /lessons/LESSON_UUID/complete
Authorization: Bearer <token>
```

---

## Media

Files are stored on the API server disk (`STORAGE_DIRECTORY`, or `.sandbox/storage`), not on AWS.

### POST /files

**Auth:** Public

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/files \
  -F "file=@./lesson.mp4"
```

**2) Use case**

Upload one or more videos, images, or PDFs. Each file is written to disk and a `media` row is created. The response `id` is the `mediaId` used when creating a lesson. There is no file-type or size limit on this route.

**3) Example API call**

```http
POST /files
Content-Type: multipart/form-data

file: lesson.mp4
```

### GET /files/{filename}

**Auth:** Public

**1) Curl command**

```bash
curl -s -o lesson.mp4 http://127.0.0.1:3000/files/20261022T100000000Z_lesson.mp4
```

**2) Use case**

Download a previously uploaded file by its stored filename (the `fileName` from the upload response, not the original name). The body is the file bytes.

**3) Example API call**

```http
GET /files/20261022T100000000Z_lesson.mp4
```

### GET /media/{id}

**Auth:** Public

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/media/MEDIA_UUID
```

**2) Use case**

Fetch media metadata (name, URL, type, size) by id.

**3) Example API call**

```http
GET /media/MEDIA_UUID
```

---

## Assessments

### POST /courses/{id}/assessments

**Auth:** JWT, roles `admin`, `content`, or `academic`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/courses/COURSE_UUID/assessments \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Module 1 Quiz",
    "type": "quiz",
    "moduleId": "MODULE_UUID",
    "description": "Check equations",
    "passingPercentage": 80,
    "timeLimitMinutes": 20,
    "xpReward": 100,
    "questions": [
      {
        "type": "mcq",
        "text": "What is 2 + 2?",
        "options": ["3", "4", "5"],
        "correctAnswer": "4",
        "explanation": "Two plus two is four.",
        "points": 10,
        "orderIndex": 1
      }
    ]
  }'
```

**2) Use case**

Create a quiz, test, or module exam and its questions. Required: `title`, `type`. Each question needs `type`, `text`, and `correctAnswer`. `moduleId`, if set, must belong to the course. Defaults: passing 80, time limit 20 minutes, XP 100.

**3) Example API call**

```http
POST /courses/COURSE_UUID/assessments
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Module 1 Quiz",
  "type": "quiz",
  "moduleId": "MODULE_UUID",
  "passingPercentage": 80,
  "timeLimitMinutes": 20,
  "xpReward": 100,
  "questions": [
    {
      "type": "mcq",
      "text": "What is 2 + 2?",
      "options": ["3", "4", "5"],
      "correctAnswer": "4",
      "explanation": "Two plus two is four.",
      "points": 10,
      "orderIndex": 1
    }
  ]
}
```

### GET /courses/{id}/assessments

**Auth:** JWT

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/courses/COURSE_UUID/assessments?type=quiz" \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

List assessments for a course, with questions. Optional `type` filter. Question payloads on this route do not include the correct answer field in the selected columns.

**3) Example API call**

```http
GET /courses/COURSE_UUID/assessments?type=quiz
Authorization: Bearer <token>
```

### GET /assessments/{id}

**Auth:** JWT

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/assessments/ASSESSMENT_UUID \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Load one assessment for a student to take. Answers are stripped.

**3) Example API call**

```http
GET /assessments/ASSESSMENT_UUID
Authorization: Bearer <token>
```

### POST /assessments/{id}/submit

**Auth:** JWT

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/assessments/ASSESSMENT_UUID/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"answers":{"QUESTION_UUID":"4"}}'
```

**2) Use case**

Submit answers for auto-grading and XP. `answers` maps each question id to the student's answer.

**3) Example API call**

```http
POST /assessments/ASSESSMENT_UUID/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": {
    "QUESTION_UUID": "4"
  }
}
```

### GET /assessments/{id}/submissions/latest

**Auth:** JWT

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/assessments/ASSESSMENT_UUID/submissions/latest \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Review the signed-in student's latest submission, including explanations.

**3) Example API call**

```http
GET /assessments/ASSESSMENT_UUID/submissions/latest
Authorization: Bearer <token>
```

### GET /student/me/assessments

**Auth:** JWT

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/student/me/assessments?status=pending" \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

List assessments across the student's enrolled courses. `status=pending` or `status=completed` returns only that list; omit it to get both.

**3) Example API call**

```http
GET /student/me/assessments?status=pending
Authorization: Bearer <token>
```

---

## Gamification

### GET /gamification/badges

**Auth:** JWT

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/gamification/badges \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

List the platform badge catalog.

**3) Example API call**

```http
GET /gamification/badges
Authorization: Bearer <token>
```

### GET /student/me/badges

**Auth:** JWT

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/student/me/badges \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Return the signed-in student's unlocked badges and level progress.

**3) Example API call**

```http
GET /student/me/badges
Authorization: Bearer <token>
```

---

## Writing lab

### GET /writing-lab/prompts

**Auth:** JWT

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/writing-lab/prompts?subjectId=SUBJECT_UUID" \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

List active writing prompts. Optional `subjectId` filter.

**3) Example API call**

```http
GET /writing-lab/prompts?subjectId=SUBJECT_UUID
Authorization: Bearer <token>
```

### POST /writing-lab/submit

**Auth:** JWT

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/writing-lab/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "promptId": "PROMPT_UUID",
    "essayText": "The main idea of the passage is...",
    "attachmentMediaId": "MEDIA_UUID"
  }'
```

**2) Use case**

Submit an essay for scoring. Required: `promptId`, `essayText`. `attachmentMediaId` is optional and must be an existing media id from `POST /files`.

**3) Example API call**

```http
POST /writing-lab/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "promptId": "PROMPT_UUID",
  "essayText": "The main idea of the passage is...",
  "attachmentMediaId": "MEDIA_UUID"
}
```

### GET /student/me/writing-submissions

**Auth:** JWT

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/student/me/writing-submissions \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

List the signed-in student's past writing-lab submissions.

**3) Example API call**

```http
GET /student/me/writing-submissions
Authorization: Bearer <token>
```

---

## Certificates

### GET /student/me/certificates

**Auth:** JWT

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/student/me/certificates \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

List certificates already issued to the signed-in student.

**3) Example API call**

```http
GET /student/me/certificates
Authorization: Bearer <token>
```

### POST /courses/{id}/certificate

**Auth:** JWT

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/courses/COURSE_UUID/certificate \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Issue a certificate for the signed-in student when the course is fully complete.

**3) Example API call**

```http
POST /courses/COURSE_UUID/certificate
Authorization: Bearer <token>
```

### GET /certificates/verify/{hash}

**Auth:** Public

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/certificates/verify/CERTIFICATE_HASH
```

**2) Use case**

Public check that a certificate hash is authentic.

**3) Example API call**

```http
GET /certificates/verify/CERTIFICATE_HASH
```

---

## AI tutor

### POST /ai/tutor/chat

**Auth:** JWT

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/ai/tutor/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "courseId": "COURSE_UUID",
    "lessonId": "LESSON_UUID",
    "message": "Can you explain PEMDAS with an example?",
    "history": [
      {"role": "user", "content": "What does PEMDAS stand for?"},
      {"role": "assistant", "content": "Parentheses, Exponents, Multiplication, Division, Addition, Subtraction."}
    ]
  }'
```

**2) Use case**

Send a message to the course tutor. Required: `courseId`, `message`. `lessonId` and prior `history` are optional.

**3) Example API call**

```http
POST /ai/tutor/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "COURSE_UUID",
  "lessonId": "LESSON_UUID",
  "message": "Can you explain PEMDAS with an example?",
  "history": [
    { "role": "user", "content": "What does PEMDAS stand for?" },
    { "role": "assistant", "content": "Parentheses, Exponents, Multiplication, Division, Addition, Subtraction." }
  ]
}
```

---

## Compliance

### GET /academic/compliance-audits

**Auth:** JWT, roles `admin`, `academic`, `content`, or `operations`

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/academic/compliance-audits?courseId=COURSE_UUID" \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

List academic and NCAA compliance audits. Optional `courseId` filter.

**3) Example API call**

```http
GET /academic/compliance-audits?courseId=COURSE_UUID
Authorization: Bearer <token>
```

### POST /academic/compliance-audits

**Auth:** JWT, roles `admin` or `academic`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/academic/compliance-audits \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "courseId": "COURSE_UUID",
    "ncaaApproved": true,
    "syllabusApproved": true,
    "academicIntegrityScore": 92,
    "status": "approved",
    "notes": "Syllabus matches NCAA contact hours."
  }'
```

**2) Use case**

Record a compliance audit for a course. `courseId` is required.

**3) Example API call**

```http
POST /academic/compliance-audits
Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "COURSE_UUID",
  "ncaaApproved": true,
  "syllabusApproved": true,
  "academicIntegrityScore": 92,
  "status": "approved",
  "notes": "Syllabus matches NCAA contact hours."
}
```

---

## Test prep

### GET /test-prep/subjects

**Auth:** Public

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/test-prep/subjects?gradeLevelId=GRADE_LEVEL_UUID"
```

**2) Use case**

List test-prep subjects (Math, ELA, Science) and their practice sets. Optional `gradeLevelId`.

**3) Example API call**

```http
GET /test-prep/subjects?gradeLevelId=GRADE_LEVEL_UUID
```

### GET /test-prep/subjects/{id}/assessments

**Auth:** Public

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/test-prep/subjects/SUBJECT_UUID/assessments?gradeLevelId=GRADE_LEVEL_UUID"
```

**2) Use case**

List practice tests and diagnostics for one test-prep subject. Optional `gradeLevelId`.

**3) Example API call**

```http
GET /test-prep/subjects/SUBJECT_UUID/assessments?gradeLevelId=GRADE_LEVEL_UUID
```

### GET /student/me/test-prep

**Auth:** JWT

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/student/me/test-prep \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Return the signed-in student's test-prep dashboard metrics.

**3) Example API call**

```http
GET /student/me/test-prep
Authorization: Bearer <token>
```

---

## Payments

### GET /operations/payments

**Auth:** JWT, roles `admin` or `operations`

**1) Curl command**

```bash
curl -s "http://127.0.0.1:3000/operations/payments?page=1&limit=20&status=paid&search=ava" \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Paginated tuition payments. Optional `page`, `limit`, `status`, and `search`.

**3) Example API call**

```http
GET /operations/payments?page=1&limit=20&status=paid&search=ava
Authorization: Bearer <token>
```

### GET /operations/payments/summary

**Auth:** JWT, roles `admin` or `operations`

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/operations/payments/summary \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Revenue and payment KPI summary.

**3) Example API call**

```http
GET /operations/payments/summary
Authorization: Bearer <token>
```

### POST /operations/payments/record-offline

**Auth:** JWT, roles `admin` or `operations`

**1) Curl command**

```bash
curl -s -X POST http://127.0.0.1:3000/operations/payments/record-offline \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "usersId": "USER_UUID",
    "amount": 1200,
    "planName": "Annual tuition",
    "paymentMethod": "check",
    "transactionReference": "CHK-1044",
    "notes": "Received at front desk"
  }'
```

**2) Use case**

Record a manual payment (wire, check, or cash). Required: `usersId`, `amount`.

**3) Example API call**

```http
POST /operations/payments/record-offline
Authorization: Bearer <token>
Content-Type: application/json

{
  "usersId": "USER_UUID",
  "amount": 1200,
  "planName": "Annual tuition",
  "paymentMethod": "check",
  "transactionReference": "CHK-1044",
  "notes": "Received at front desk"
}
```

---

## Analytics

### GET /admin/analytics/overview

**Auth:** JWT, roles `admin`, `academic`, or `operations`

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/admin/analytics/overview \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Platform-wide KPI overview for the admin dashboard.

**3) Example API call**

```http
GET /admin/analytics/overview
Authorization: Bearer <token>
```

### GET /admin/reports/grade-distribution

**Auth:** JWT, roles `admin`, `academic`, or `operations`

**1) Curl command**

```bash
curl -s http://127.0.0.1:3000/admin/reports/grade-distribution \
  -H "Authorization: Bearer $TOKEN"
```

**2) Use case**

Letter-grade distribution (A through F) across the student cohort.

**3) Example API call**

```http
GET /admin/reports/grade-distribution
Authorization: Bearer <token>
```
