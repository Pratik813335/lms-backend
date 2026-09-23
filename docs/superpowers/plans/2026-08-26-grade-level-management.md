# Grade Level Management Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Admin can list/create/edit grade levels via API-backed service and `/admin/grade-levels` page.

**Architecture:** Add masters endpoints + `adminService` methods (mirror `authService`). New admin page following `Staff.tsx` patterns. Wire route + sidebar.

**Tech Stack:** React, wouter, existing UI components, axios `apiClient`, Vite.

## Global Constraints

- Follow `authService` export style (object of async methods + exported types)
- API paths without leading slash inconsistency: prefer no leading slash like `auth/login` → `masters/grade-levels`
- Do not commit unless user asks
- No `deletedAt` in create/update payloads from UI

---

### Task 1: Endpoints + adminService

**Files:**
- Modify: `core/api/apiEndpoint.ts`
- Modify: `core/service/adminService.ts`

- [ ] Add `GRADE_LEVELS: "masters/grade-levels"` and helper `gradeLevel(id) => masters/grade-levels/${id}`
- [ ] Add types: `GradeLevel`, `GradeLevelPayload`, `GradeLevelsResponse`, `GradeLevelMutationResponse`
- [ ] Implement `getGradeLevels`, `createGradeLevel`, `updateGradeLevel`

**Done when:** Service compiles and matches Staff/auth patterns.

---

### Task 2: Admin Grade Levels page

**Files:**
- Create: `src/pages/admin/GradeLevels.tsx`

- [ ] List on mount via `adminService.getGradeLevels`
- [ ] Search by label/value/description
- [ ] Create + Edit dialogs (same form fields)
- [ ] Loading / error / empty states
- [ ] Refresh list after successful create/update

**Done when:** Page works against live API with valid session cookie/token.

---

### Task 3: Route + sidebar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] Route `/admin/grade-levels`
- [ ] Nav item “Grade Levels” with `GraduationCap` (or `Layers`) after Students/Staff

**Done when:** Navigable from admin sidebar.
