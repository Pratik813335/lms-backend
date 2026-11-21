# Additional LMS Backend APIs

Curl commands and sample responses for endpoints **not** covered by the existing frontend `API_ENDPOINTS` map.

**Base URL:** `http://lms-backend.technorthstar.com`  
**Auth:** Replace `TOKEN` with a valid JWT (`Authorization: Bearer TOKEN`).

Envelope used by most endpoints:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

---

## Table of contents

1. [Assessments](#1-assessments)
2. [Test Prep](#2-test-prep)
3. [AI Tutor](#3-ai-tutor)
4. [Writing Lab](#4-writing-lab)
5. [Gamification / Badges](#5-gamification--badges)
6. [Certificates](#6-certificates)
7. [Course allocation & roster](#7-course-allocation--roster)
8. [Admin / operations user management](#8-admin--operations-user-management)
9. [Payments (operations)](#9-payments-operations)
10. [Analytics & reports](#10-analytics--reports)
11. [Academic compliance](#11-academic-compliance)

---

## 1. Assessments

### Create assessment (admin / content / academic)

```bash
curl -X POST "http://lms-backend.technorthstar.com/courses/{courseId}/assessments" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Module 1 Checkpoint Quiz",
    "type": "quiz",
    "moduleId": "MODULE_UUID",
    "description": "Covers equations and inequalities",
    "passingPercentage": 80,
    "timeLimitMinutes": 20,
    "xpReward": 100,
    "questions": [
      {
        "type": "mcq",
        "text": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correctAnswer": "4",
        "explanation": "Basic addition",
        "points": 10,
        "orderIndex": 1
      }
    ]
  }'
```

**Sample response**

```json
{
  "success": true,
  "message": "Assessment created successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "courseId": "COURSE_UUID",
    "moduleId": "MODULE_UUID",
    "title": "Module 1 Checkpoint Quiz",
    "type": "quiz",
    "description": "Covers equations and inequalities",
    "passingPercentage": 80,
    "timeLimitMinutes": 20,
    "xpReward": 100,
    "isActive": true,
    "questions": [
      {
        "id": "q1111111-1111-1111-1111-111111111111",
        "type": "mcq",
        "text": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correctAnswer": "4",
        "points": 10,
        "orderIndex": 1
      }
    ]
  }
}
```

### List assessments for a course

```bash
curl -X GET "http://lms-backend.technorthstar.com/courses/{courseId}/assessments?type=quiz" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Assessments retrieved successfully",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "courseId": "COURSE_UUID",
      "title": "Module 1 Checkpoint Quiz",
      "type": "quiz",
      "passingPercentage": 80,
      "timeLimitMinutes": 20,
      "questions": [
        {
          "id": "q1111111-1111-1111-1111-111111111111",
          "type": "mcq",
          "text": "What is 2 + 2?",
          "options": ["3", "4", "5", "6"],
          "points": 10,
          "orderIndex": 1
        }
      ]
    }
  ]
}
```

### Get assessment for taking (answers sanitized)

```bash
curl -X GET "http://lms-backend.technorthstar.com/assessments/{assessmentId}" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Assessment retrieved successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Module 1 Checkpoint Quiz",
    "type": "quiz",
    "passingPercentage": 80,
    "timeLimitMinutes": 20,
    "xpReward": 100,
    "questions": [
      {
        "id": "q1111111-1111-1111-1111-111111111111",
        "type": "mcq",
        "text": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "points": 10,
        "orderIndex": 1
      }
    ]
  }
}
```

### Submit assessment answers

```bash
curl -X POST "http://lms-backend.technorthstar.com/assessments/{assessmentId}/submit" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "q1111111-1111-1111-1111-111111111111": "4"
    }
  }'
```

**Sample response**

```json
{
  "success": true,
  "message": "Assessment submitted and graded successfully",
  "data": {
    "submissionId": "s1111111-1111-1111-1111-111111111111",
    "assessmentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Module 1 Checkpoint Quiz",
    "score": 100,
    "pointsEarned": 10,
    "totalPoints": 10,
    "isPassed": true,
    "passingPercentage": 80,
    "xpAwarded": 100,
    "questionResults": [
      {
        "questionId": "q1111111-1111-1111-1111-111111111111",
        "isCorrect": true,
        "studentAnswer": "4",
        "correctAnswer": "4",
        "explanation": "Basic addition",
        "pointsEarned": 10
      }
    ],
    "aiFeedback": {
      "headline": "Outstanding Mastery",
      "body": "You demonstrated exceptional command of ...",
      "suggestions": [
        "Attempt extension scenario problems to deepen conceptual mastery."
      ]
    }
  }
}
```

### Latest submission review

```bash
curl -X GET "http://lms-backend.technorthstar.com/assessments/{assessmentId}/submissions/latest" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Assessment review retrieved successfully",
  "data": {
    "id": "s1111111-1111-1111-1111-111111111111",
    "assessmentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "usersId": "USER_UUID",
    "score": 100,
    "isPassed": true,
    "answers": {
      "q1111111-1111-1111-1111-111111111111": "4"
    },
    "submittedAt": "2026-10-07T06:30:00.000Z",
    "assessment": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Module 1 Checkpoint Quiz",
      "questions": []
    }
  }
}
```

### Student assessments dashboard

```bash
curl -X GET "http://lms-backend.technorthstar.com/student/me/assessments" \
  -H "Authorization: Bearer TOKEN"

# Optional filter:
curl -X GET "http://lms-backend.technorthstar.com/student/me/assessments?status=pending" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Student assessments retrieved",
  "data": {
    "pending": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "courseId": "COURSE_UUID",
        "courseTitle": "Algebra 1",
        "title": "Module 1 Checkpoint Quiz",
        "type": "quiz",
        "questionCount": 5,
        "passingPercentage": 80,
        "timeLimitMinutes": 20,
        "score": null,
        "isPassed": null,
        "submittedAt": null,
        "status": "pending"
      }
    ],
    "completed": []
  }
}
```

---

## 2. Test Prep

### List test-prep subjects (public)

```bash
curl -X GET "http://lms-backend.technorthstar.com/test-prep/subjects?gradeLevelId=GRADE_UUID"
```

**Sample response**

```json
{
  "success": true,
  "message": "Test prep subjects retrieved successfully",
  "data": [
    {
      "id": "SUBJ_UUID",
      "label": "Mathematics",
      "value": "math",
      "description": "Core Mathematics test preparation and practice drills",
      "icon": "Sigma",
      "totalPracticeSets": 6,
      "totalQuestions": 60,
      "isTestPrep": true
    }
  ]
}
```

### Assessments for a test-prep subject (public)

```bash
curl -X GET "http://lms-backend.technorthstar.com/test-prep/subjects/{subjectId}/assessments?gradeLevelId=GRADE_UUID"
```

**Sample response**

```json
{
  "success": true,
  "message": "Test prep assessments retrieved successfully",
  "data": {
    "subject": {
      "id": "SUBJ_UUID",
      "label": "Mathematics",
      "value": "math"
    },
    "assessments": [
      {
        "id": "ASSESS_UUID",
        "title": "Grade 6 Math Practice Paper A",
        "type": "practice_test",
        "description": "Diagnostic practice set",
        "paperCode": "G6-MATH-A",
        "passingPercentage": 80,
        "timeLimitMinutes": 45,
        "questionCount": 20,
        "xpReward": 100,
        "difficulty": "Standard"
      }
    ]
  }
}
```

### Student test-prep dashboard

```bash
curl -X GET "http://lms-backend.technorthstar.com/student/me/test-prep" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Student test prep dashboard retrieved successfully",
  "data": {
    "student": {
      "id": "USER_UUID",
      "gradeLevel": "Grade 6",
      "tier": "junior",
      "hasTestPrep": true,
      "hasFullCurriculum": false
    },
    "stats": {
      "totalPracticesCompleted": 3,
      "accuracyRate": 67,
      "averageScore": 78
    },
    "subjects": []
  }
}
```

---

## 3. AI Tutor

### Chat with AI tutor

```bash
curl -X POST "http://lms-backend.technorthstar.com/ai/tutor/chat" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "COURSE_UUID",
    "lessonId": "LESSON_UUID",
    "message": "Can you explain slope in linear equations?",
    "history": [
      { "role": "user", "content": "Hi" },
      { "role": "assistant", "content": "Hello! How can I help?" }
    ]
  }'
```

**Sample response**

```json
{
  "success": true,
  "message": "AI Tutor response generated successfully",
  "data": {
    "reply": "In Algebra 1, **slope (m)** measures the steepness...",
    "suggestedQuestions": [
      "How do I find the y-intercept from slope-intercept form?",
      "What is the difference between parallel and perpendicular lines?"
    ],
    "courseContext": {
      "courseTitle": "Algebra 1",
      "subject": "Mathematics",
      "currentTopic": "Linear Equations"
    }
  }
}
```

---

## 4. Writing Lab

### List writing prompts

```bash
curl -X GET "http://lms-backend.technorthstar.com/writing-lab/prompts?subjectId=SUBJ_UUID" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Writing prompts retrieved successfully",
  "data": [
    {
      "id": "PROMPT_UUID",
      "title": "Argumentative Essay: School Uniforms",
      "promptText": "Write an argumentative essay...",
      "subjectId": "SUBJ_UUID",
      "subjectCategory": "ELA",
      "wordCountTarget": 500,
      "isActive": true
    }
  ]
}
```

### Submit essay for AI scoring

```bash
curl -X POST "http://lms-backend.technorthstar.com/writing-lab/submit" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "promptId": "PROMPT_UUID",
    "essayText": "School uniforms promote equality because they reduce visible socioeconomic differences. For example, students no longer compete based on clothing brands...\n\nIn conclusion, uniforms create a more focused learning environment.",
    "attachmentMediaId": "MEDIA_UUID"
  }'
```

**Sample response**

```json
{
  "success": true,
  "message": "Essay evaluated and submitted successfully",
  "data": {
    "id": "SUBMISSION_UUID",
    "usersId": "USER_UUID",
    "promptId": "PROMPT_UUID",
    "wordCount": 120,
    "overallScore": 78.1,
    "overallLabel": "Proficient",
    "dimensionScores": {
      "ideasAndAnalysis": 2.5,
      "developmentAndSupport": 3.5,
      "organization": 4.0,
      "languageUse": 3.0
    },
    "aiFeedback": {
      "headline": "Strong ELA Submission — Proficient Level",
      "grammarFeedback": [
        "Strong central thesis and topic sentences establishing the argument."
      ],
      "suggestions": [
        "Incorporate counter-arguments in the final body paragraph..."
      ]
    },
    "status": "evaluated",
    "submittedAt": "2026-10-07T06:40:00.000Z"
  }
}
```

### My writing submissions

```bash
curl -X GET "http://lms-backend.technorthstar.com/student/me/writing-submissions" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Writing submissions retrieved successfully",
  "data": [
    {
      "id": "SUBMISSION_UUID",
      "overallScore": 78.1,
      "overallLabel": "Proficient",
      "wordCount": 120,
      "status": "evaluated",
      "submittedAt": "2026-10-07T06:40:00.000Z",
      "prompt": {
        "id": "PROMPT_UUID",
        "title": "Argumentative Essay: School Uniforms"
      }
    }
  ]
}
```

---

## 5. Gamification / Badges

### Platform badge catalog

```bash
curl -X GET "http://lms-backend.technorthstar.com/gamification/badges" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Platform badges retrieved successfully",
  "data": [
    {
      "id": "BADGE_UUID",
      "title": "First Steps",
      "description": "Complete your first lesson",
      "icon": "Star",
      "category": "Academic",
      "rarity": "common",
      "milestoneType": "completed_lessons",
      "milestoneCount": 1,
      "xpReward": 50
    }
  ]
}
```

### Student badges & progress

```bash
curl -X GET "http://lms-backend.technorthstar.com/student/me/badges" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Student badges and gamification progress retrieved successfully",
  "data": {
    "totalXp": 450,
    "level": 2,
    "unlockedCount": 1,
    "unlockedBadges": [
      {
        "id": "BADGE_UUID",
        "title": "First Steps",
        "description": "Complete your first lesson",
        "icon": "Star",
        "category": "Academic",
        "rarity": "common",
        "unlockedAt": "2026-10-01T12:00:00.000Z"
      }
    ],
    "lockedBadges": [
      {
        "id": "BADGE_UUID_2",
        "title": "Week Warrior",
        "milestoneType": "streak_days",
        "milestoneCount": 7,
        "xpReward": 150
      }
    ]
  }
}
```

---

## 6. Certificates

### My certificates

```bash
curl -X GET "http://lms-backend.technorthstar.com/student/me/certificates" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Student certificates retrieved successfully",
  "data": [
    {
      "id": "CERT_UUID",
      "certificateNumber": "LP-CERT-ABCDEF-1234",
      "studentName": "Jane Doe",
      "courseName": "Algebra 1",
      "credits": 1.0,
      "status": "issued",
      "type": "course_completion",
      "issueDate": "2026-10-07T06:00:00.000Z",
      "verificationHash": "sha256hex...",
      "course": {
        "id": "COURSE_UUID",
        "title": "Algebra 1"
      }
    }
  ]
}
```

### Issue certificate (requires 100% course progress)

```bash
curl -X POST "http://lms-backend.technorthstar.com/courses/{courseId}/certificate" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Certificate issued successfully",
  "data": {
    "id": "CERT_UUID",
    "certificateNumber": "LP-CERT-ABCDEF-1234",
    "studentName": "Jane Doe",
    "courseName": "Algebra 1",
    "credits": 1.0,
    "accreditationBody": "LucidPrep Accredited Academy",
    "status": "issued",
    "type": "course_completion",
    "issueDate": "2026-10-07T06:00:00.000Z",
    "verificationHash": "sha256hex..."
  }
}
```

### Verify certificate (public)

```bash
curl -X GET "http://lms-backend.technorthstar.com/certificates/verify/{verificationHash}"
```

**Sample response**

```json
{
  "success": true,
  "message": "Certificate verified successfully",
  "data": {
    "isValid": true,
    "certificateNumber": "LP-CERT-ABCDEF-1234",
    "studentName": "Jane Doe",
    "courseName": "Algebra 1",
    "credits": 1.0,
    "issueDate": "2026-10-07T06:00:00.000Z",
    "accreditationBody": "LucidPrep Accredited Academy"
  }
}
```

---

## 7. Course allocation & roster

### Assign instructor (admin / content / academic)

```bash
curl -X POST "http://lms-backend.technorthstar.com/courses/{courseId}/instructors/assign" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "instructorId": "INSTRUCTOR_USER_UUID" }'
```

**Sample response**

```json
{
  "success": true,
  "message": "Instructor assigned successfully",
  "data": {
    "courseId": "COURSE_UUID",
    "instructorId": "INSTRUCTOR_USER_UUID",
    "instructorName": "Alex Content",
    "message": "Instructor successfully assigned to course"
  }
}
```

### Batch enroll students (admin / content / academic)

```bash
curl -X POST "http://lms-backend.technorthstar.com/courses/{courseId}/students/batch-enroll" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentUserIds": ["STUDENT_UUID_1", "STUDENT_UUID_2"],
    "learningMode": "credit"
  }'
```

**Sample response**

```json
{
  "success": true,
  "message": "Batch enrollment completed",
  "data": {
    "courseId": "COURSE_UUID",
    "totalRequested": 2,
    "successfullyEnrolled": 2,
    "learningMode": "credit",
    "message": "Successfully enrolled 2 students into course"
  }
}
```

### Course roster (admin / content / academic / operations)

```bash
curl -X GET "http://lms-backend.technorthstar.com/courses/{courseId}/roster" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Course roster retrieved successfully",
  "data": {
    "courseId": "COURSE_UUID",
    "courseTitle": "Algebra 1",
    "totalStudentsEnrolled": 1,
    "roster": [
      {
        "enrollmentId": "ENROLL_UUID",
        "studentId": "STUDENT_UUID",
        "studentName": "Jane Doe",
        "studentEmail": "jane@example.com",
        "gradeLevel": "Grade 10",
        "progressRate": 40,
        "status": "active",
        "performanceStatus": "on_track",
        "enrolledAt": "2026-09-01T10:00:00.000Z"
      }
    ]
  }
}
```

### Staff unenroll a student

```bash
curl -X DELETE "http://lms-backend.technorthstar.com/courses/{courseId}/enroll?userId=STUDENT_UUID" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Student unenrolled from course",
  "data": {
    "courseId": "COURSE_UUID",
    "userId": "STUDENT_UUID",
    "message": "Student successfully unenrolled from course"
  }
}
```

### Student self-drop course

```bash
curl -X DELETE "http://lms-backend.technorthstar.com/student/me/courses/{courseId}/enroll" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Successfully dropped course",
  "data": {
    "courseId": "COURSE_UUID",
    "userId": "STUDENT_UUID",
    "message": "Student successfully unenrolled from course"
  }
}
```

---

## 8. Admin / operations user management

### Update staff user (admin only)

```bash
curl -X PATCH "http://lms-backend.technorthstar.com/admin/users/{userId}" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Updated Staff Name",
    "phone": "+1-555-0100",
    "roleId": "ROLE_UUID",
    "isActive": true
  }'
```

**Sample response**

```json
{
  "success": true,
  "message": "Staff user updated successfully",
  "data": {
    "id": "USER_UUID",
    "email": "content@example.com",
    "fullName": "Updated Staff Name",
    "phone": "+1-555-0100",
    "isActive": true,
    "roles": [{ "id": "ROLE_UUID", "value": "content", "label": "Content Creator / Curriculum Author" }]
  }
}
```

### Deactivate staff user (admin only)

```bash
curl -X DELETE "http://lms-backend.technorthstar.com/admin/users/{userId}" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Staff user deactivated successfully",
  "data": { "id": "USER_UUID" }
}
```

### Update student by admin (admin / academic / operations)

```bash
curl -X PATCH "http://lms-backend.technorthstar.com/admin/students/{userId}" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Doe Updated",
    "gradeLevelId": "GRADE_UUID",
    "gpa": 3.75,
    "isActive": true
  }'
```

**Sample response**

```json
{
  "success": true,
  "message": "Student updated successfully",
  "data": {
    "user": {
      "id": "USER_UUID",
      "email": "jane@example.com",
      "fullName": "Jane Doe Updated",
      "isActive": true
    },
    "profile": {
      "usersId": "USER_UUID",
      "gpa": 3.75,
      "gradeLevelId": "GRADE_UUID",
      "tier": "senior",
      "gradeLevel": { "id": "GRADE_UUID", "label": "Grade 10" }
    }
  }
}
```

### Deactivate student (admin / operations)

```bash
curl -X DELETE "http://lms-backend.technorthstar.com/admin/students/{userId}" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Student deactivated successfully",
  "data": { "id": "USER_UUID" }
}
```

---

## 9. Payments (operations)

Roles: `admin`, `operations`

### List payments

```bash
curl -X GET "http://lms-backend.technorthstar.com/operations/payments?page=1&limit=10&status=succeeded&search=jane" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Payments list retrieved successfully",
  "data": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "items": [
      {
        "id": "PAY_UUID",
        "amount": 89.0,
        "currency": "USD",
        "status": "succeeded",
        "planName": "Premium Monthly",
        "paymentMethod": "wire",
        "transactionReference": "TXN-ABC12345",
        "notes": "Wire received 10/01",
        "customerName": "Jane Doe",
        "customerEmail": "jane@example.com",
        "paidAt": "2026-10-01T15:00:00.000Z"
      }
    ]
  }
}
```

### Payment revenue summary

```bash
curl -X GET "http://lms-backend.technorthstar.com/operations/payments/summary" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Payment revenue summary retrieved successfully",
  "data": {
    "grossVolume": 18420.0,
    "mrr": 16500.0,
    "activeSubscribers": 184,
    "newThisMonth": 23,
    "currency": "USD",
    "planBreakdown": [
      { "name": "Premium Monthly ($89/mo)", "percentage": 45, "subscriberCount": 83 },
      { "name": "Standard Monthly ($49/mo)", "percentage": 35, "subscriberCount": 64 },
      { "name": "Basic Monthly ($29/mo)", "percentage": 20, "subscriberCount": 37 }
    ]
  }
}
```

### Record offline payment

```bash
curl -X POST "http://lms-backend.technorthstar.com/operations/payments/record-offline" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "usersId": "STUDENT_UUID",
    "amount": 89.0,
    "planName": "Premium Monthly",
    "paymentMethod": "wire",
    "transactionReference": "WIRE-2026-1001",
    "notes": "Bank transfer confirmed"
  }'
```

**Sample response**

```json
{
  "success": true,
  "message": "Offline payment recorded successfully",
  "data": {
    "id": "PAY_UUID",
    "usersId": "STUDENT_UUID",
    "amount": 89.0,
    "currency": "USD",
    "status": "succeeded",
    "planName": "Premium Monthly",
    "paymentMethod": "wire",
    "transactionReference": "WIRE-2026-1001",
    "notes": "Bank transfer confirmed",
    "paidAt": "2026-10-07T06:50:00.000Z"
  }
}
```

---

## 10. Analytics & reports

Roles: `admin`, `academic`, `operations`

### Platform overview KPIs

```bash
curl -X GET "http://lms-backend.technorthstar.com/admin/analytics/overview" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Platform analytics overview retrieved successfully",
  "data": {
    "totalActiveStudents": 120,
    "totalActiveCourses": 18,
    "totalEnrollments": 340,
    "courseCompletionRate": 78,
    "averageGpa": 3.45,
    "totalXpAwarded": 54000,
    "weeklyActiveHoursTarget": 6.0,
    "studentRetentionRate": 94.2,
    "ncaaComplianceRate": 98.0
  }
}
```

### Grade distribution report

```bash
curl -X GET "http://lms-backend.technorthstar.com/admin/reports/grade-distribution" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Grade distribution report retrieved successfully",
  "data": {
    "totalEvaluations": 100,
    "distribution": [
      { "grade": "A (90–100%)", "count": 42, "percentage": 42 },
      { "grade": "B (80–89%)", "count": 35, "percentage": 35 },
      { "grade": "C (70–79%)", "count": 15, "percentage": 15 },
      { "grade": "D (60–69%)", "count": 5, "percentage": 5 },
      { "grade": "F (<60%)", "count": 3, "percentage": 3 }
    ]
  }
}
```

---

## 11. Academic compliance

### List compliance audits

Roles: `admin`, `academic`, `content`, `operations`

```bash
curl -X GET "http://lms-backend.technorthstar.com/academic/compliance-audits?courseId=COURSE_UUID" \
  -H "Authorization: Bearer TOKEN"
```

**Sample response**

```json
{
  "success": true,
  "message": "Compliance audits retrieved successfully",
  "data": [
    {
      "id": "AUDIT_UUID",
      "courseId": "COURSE_UUID",
      "auditorId": "ADMIN_UUID",
      "ncaaApproved": true,
      "syllabusApproved": true,
      "academicIntegrityScore": 100,
      "status": "approved",
      "notes": "Syllabus meets NCAA core-course standards",
      "auditedAt": "2026-10-07T07:00:00.000Z",
      "course": { "id": "COURSE_UUID", "title": "Algebra 1", "ncaaApproved": true },
      "auditor": { "id": "ADMIN_UUID", "fullName": "Super Admin", "email": "admin@example.com" }
    }
  ]
}
```

### Record compliance audit

Roles: `admin`, `academic`

```bash
curl -X POST "http://lms-backend.technorthstar.com/academic/compliance-audits" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "COURSE_UUID",
    "ncaaApproved": true,
    "syllabusApproved": true,
    "academicIntegrityScore": 98,
    "status": "approved",
    "notes": "Syllabus meets NCAA core-course standards"
  }'
```

**Sample response**

```json
{
  "success": true,
  "message": "Course compliance audit recorded successfully",
  "data": {
    "id": "AUDIT_UUID",
    "courseId": "COURSE_UUID",
    "auditorId": "ADMIN_UUID",
    "ncaaApproved": true,
    "syllabusApproved": true,
    "academicIntegrityScore": 98,
    "status": "approved",
    "notes": "Syllabus meets NCAA core-course standards",
    "auditedAt": "2026-10-07T07:00:00.000Z"
  }
}
```

---

## Suggested frontend constants for these endpoints

```ts
export const ADDITIONAL_API_ENDPOINTS = {
  // Assessments
  courseAssessments: (courseId: string) => `/courses/${courseId}/assessments`,
  assessmentById: (id: string) => `/assessments/${id}`,
  assessmentSubmit: (id: string) => `/assessments/${id}/submit`,
  assessmentLatestSubmission: (id: string) => `/assessments/${id}/submissions/latest`,
  STUDENT_ASSESSMENTS: "/student/me/assessments",

  // Test prep
  TEST_PREP_SUBJECTS: "/test-prep/subjects",
  testPrepAssessments: (subjectId: string) => `/test-prep/subjects/${subjectId}/assessments`,
  STUDENT_TEST_PREP: "/student/me/test-prep",

  // AI / Writing / Gamification
  AI_TUTOR_CHAT: "/ai/tutor/chat",
  WRITING_LAB_PROMPTS: "/writing-lab/prompts",
  WRITING_LAB_SUBMIT: "/writing-lab/submit",
  STUDENT_WRITING_SUBMISSIONS: "/student/me/writing-submissions",
  GAMIFICATION_BADGES: "/gamification/badges",
  STUDENT_BADGES: "/student/me/badges",

  // Certificates
  STUDENT_CERTIFICATES: "/student/me/certificates",
  courseCertificate: (courseId: string) => `/courses/${courseId}/certificate`,
  certificateVerify: (hash: string) => `/certificates/verify/${hash}`,

  // Course ops
  courseAssignInstructor: (courseId: string) => `/courses/${courseId}/instructors/assign`,
  courseBatchEnroll: (courseId: string) => `/courses/${courseId}/students/batch-enroll`,
  courseRoster: (courseId: string) => `/courses/${courseId}/roster`,
  courseUnenroll: (courseId: string) => `/courses/${courseId}/enroll`, // DELETE ?userId=
  studentSelfUnenroll: (courseId: string) => `/student/me/courses/${courseId}/enroll`,

  // Admin users / students
  adminUserById: (id: string) => `/admin/users/${id}`,
  adminStudentById: (id: string) => `/admin/students/${id}`,

  // Payments
  OPERATIONS_PAYMENTS: "/operations/payments",
  OPERATIONS_PAYMENTS_SUMMARY: "/operations/payments/summary",
  OPERATIONS_RECORD_OFFLINE: "/operations/payments/record-offline",

  // Analytics / compliance
  ADMIN_ANALYTICS_OVERVIEW: "/admin/analytics/overview",
  ADMIN_GRADE_DISTRIBUTION: "/admin/reports/grade-distribution",
  ACADEMIC_COMPLIANCE_AUDITS: "/academic/compliance-audits",
};
```
