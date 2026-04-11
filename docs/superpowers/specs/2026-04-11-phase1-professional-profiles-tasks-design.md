# Phase 1: Professional Profiles + Tasks Feature

## Summary

Phase 1 transforms NouPro's Personal mode into a LinkedIn-like professional networking experience by adding rich professional profiles (work experience, education, certifications, skills) and introduces a general-purpose Tasks system for business operations.

**Out of scope (already exists):** Cart screens, Orders/Deliveries screens.

---

## 1. Professional Profiles

### 1.1 Database Schema Changes

**Extend User model** with new fields:

```prisma
model User {
  // ... existing fields ...
  headline      String?    // "Distribution Manager at ABC Corp"
  bio           String?    // Longer "About" section
  industry      String?    // Primary industry
  coverPhoto    String?    // Cover image URL
  profileSlug   String?  @unique  // Public URL slug e.g. "arnaud-labonne"

  // New relations
  workExperiences   WorkExperience[]
  education         Education[]
  certifications    Certification[]
  userSkills        UserSkill[]
}
```

**New model: WorkExperience** (standalone, decoupled from BusinessMember):

```prisma
model WorkExperience {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyName       String
  companyLogo       String?
  position          String
  description       String?
  industry          String?
  location          String?
  startDate         DateTime
  endDate           DateTime?
  isCurrent         Boolean   @default(false)
  linkedBusinessId  String?   // Optional link to a NouPro Business
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([userId])
}
```

**New model: Education**:

```prisma
model Education {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  institution   String
  degree        String?
  fieldOfStudy  String?
  description   String?
  startDate     DateTime?
  endDate       DateTime?
  isCurrent     Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId])
}
```

**New model: Certification**:

```prisma
model Certification {
  id                   String    @id @default(uuid())
  userId               String
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name                 String
  issuingOrganization  String
  issueDate            DateTime?
  expirationDate       DateTime?
  credentialId         String?
  credentialUrl        String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([userId])
}
```

**New model: Skill** (master table, reusable across users):

```prisma
model Skill {
  id        String      @id @default(uuid())
  name      String      @unique  // Max 100 chars enforced at API level
  category  String?
  createdAt DateTime    @default(now())

  userSkills UserSkill[]
}
// Note: Skill creation is rate-limited. Name max 100 chars, lowercased + trimmed for dedup.

```

**New model: UserSkill** (junction):

```prisma
model UserSkill {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  skillId      String
  skill        Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
  displayOrder Int      @default(0)
  createdAt    DateTime @default(now())

  @@unique([userId, skillId])
  @@index([userId])
}
```

### 1.2 Backend API Endpoints

All authenticated endpoints use `requireAuth` middleware. The `/me/` pattern means "current user". Profile data (experiences, education, certifications, skills) can only be modified by the owning user — the `/me/` endpoints enforce this automatically via `req.user.id`.

#### Work Experience

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:userId/experiences` | List user's work experiences (public, sorted by startDate desc) |
| POST | `/api/users/me/experiences` | Add work experience |
| PATCH | `/api/users/me/experiences/:id` | Update work experience |
| DELETE | `/api/users/me/experiences/:id` | Delete work experience |

**POST/PATCH body:**
```json
{
  "companyName": "ABC Corp",
  "companyLogo": "https://...",
  "position": "Distribution Manager",
  "description": "Managed distribution...",
  "industry": "Distribution",
  "location": "Port Louis, Mauritius",
  "startDate": "2020-01-15",
  "endDate": null,
  "isCurrent": true,
  "linkedBusinessId": "optional-uuid"
}
```

#### Education

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:userId/education` | List user's education (sorted by startDate desc) |
| POST | `/api/users/me/education` | Add education entry |
| PATCH | `/api/users/me/education/:id` | Update education entry |
| DELETE | `/api/users/me/education/:id` | Delete education entry |

**POST/PATCH body:**
```json
{
  "institution": "University of Mauritius",
  "degree": "Bachelor of Commerce",
  "fieldOfStudy": "Business Administration",
  "description": "Focused on supply chain...",
  "startDate": "2015-09-01",
  "endDate": "2019-06-30",
  "isCurrent": false
}
```

#### Certifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:userId/certifications` | List user's certifications |
| POST | `/api/users/me/certifications` | Add certification |
| PATCH | `/api/users/me/certifications/:id` | Update certification |
| DELETE | `/api/users/me/certifications/:id` | Delete certification |

**POST/PATCH body:**
```json
{
  "name": "Certified Supply Chain Professional",
  "issuingOrganization": "APICS",
  "issueDate": "2022-03-15",
  "expirationDate": "2025-03-15",
  "credentialId": "CSCP-12345",
  "credentialUrl": "https://verify.apics.org/..."
}
```

#### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills/search?q=` | Search/autocomplete skills from master table |
| GET | `/api/users/:userId/skills` | List user's skills (ordered by displayOrder) |
| POST | `/api/users/me/skills` | Add skill to profile (creates in master table if new) |
| DELETE | `/api/users/me/skills/:skillId` | Remove skill from profile |
| PATCH | `/api/users/me/skills/reorder` | Reorder skills (body: `{ skillIds: string[] }`) |

**POST body:**
```json
{
  "name": "Supply Chain Management"
}
```

#### Extended Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/auth/me` | Extended to accept: headline, bio, industry, coverPhoto, profileSlug |
| GET | `/api/profile/:slug` | Public profile by slug (no auth required) |
| GET | `/api/users/me/profile-completeness` | Returns completeness percentage and missing sections |

**Profile Completeness Algorithm:**
| Section | Weight | Condition |
|---------|--------|-----------|
| Profile photo | 10% | avatar is set |
| Cover photo | 5% | coverPhoto is set |
| Headline | 15% | headline is set |
| Bio | 10% | bio is set and > 20 chars |
| Industry | 5% | industry is set |
| 1+ Work experience | 20% | at least one WorkExperience |
| 1+ Education | 15% | at least one Education |
| 1+ Skill | 10% | at least one UserSkill |
| 1+ Certification | 10% | at least one Certification |

**Completeness response:**
```json
{
  "percentage": 65,
  "completed": ["photo", "headline", "experience", "skills"],
  "missing": ["cover", "bio", "industry", "education", "certification"]
}
```

### 1.3 Frontend Screens

#### Modified: PersonalProfileScreen (major redesign)

**Layout top to bottom:**
1. Cover photo (full-width, with edit overlay for own profile)
2. Avatar (overlapping cover bottom edge) + Name + Headline
3. Industry + Location + Connections count
4. Action buttons: Edit Profile / Share Profile (own) or Connect / Message (others)
5. Profile completeness progress bar (only if < 100%, only on own profile)
6. **About** section — bio text, expandable if long
7. **Experience** section — list of WorkExperience cards (company logo, position, company name, date range, description). "Add experience" button on own profile.
8. **Education** section — list of Education cards (institution, degree, field, date range). "Add education" button.
9. **Skills** section — pill/tag list of skills. "Add skills" button. Tap to manage.
10. **Certifications** section — list of Certification cards (name, org, dates, credential link). "Add certification" button.

Each section is collapsible. Empty sections show a CTA prompt ("Add your education to strengthen your profile").

#### Modified: EditPersonalProfileScreen (extended)

Add fields for:
- Headline (text input, max 120 chars)
- Bio (multiline text, max 2000 chars)
- Industry (dropdown/picker from predefined list)
- Cover photo (image upload, same as avatar flow)
- Profile slug (text input with availability check)

Keep existing: name, avatar, job_title, description, address, privacy settings.

#### New: AddEducationScreen

Form fields:
- Institution name (required, text input)
- Degree (optional, text input — e.g., "Bachelor's", "Master's", "MBA")
- Field of study (optional, text input)
- Start date (date picker, month/year)
- End date (date picker, month/year — disabled if "currently studying")
- "I'm currently studying here" toggle
- Description (optional, multiline text)

Save → POST `/api/users/me/education` → navigate back

#### New: EditEducationScreen

Same form as AddEducationScreen, pre-filled. Plus "Delete" button.
Save → PATCH, Delete → DELETE with confirmation dialog.

#### New: AddCertificationScreen

Form fields:
- Certification name (required)
- Issuing organization (required)
- Issue date (date picker, month/year)
- Expiration date (optional, date picker — disabled if "does not expire")
- Credential ID (optional, text input)
- Credential URL (optional, text input with URL validation)

#### New: EditCertificationScreen

Same form, pre-filled. Plus "Delete" button.

#### New: SkillsManagementScreen

- Search bar at top (searches `/api/skills/search?q=`)
- Autocomplete dropdown showing matching skills
- Tap to add → POST `/api/users/me/skills`
- Below search: current skills as draggable list (reorder via drag)
- Swipe-to-remove on each skill
- Max 50 skills per user

#### Existing: AddWorkExperienceScreen & EditWorkExperienceScreen

These already exist and work. They will be updated to:
- POST/PATCH to the new `/api/users/me/experiences` endpoint (instead of BusinessMember manipulation)
- Support the new `description`, `industry`, `location` fields

### 1.4 Frontend Types

**New types in `src/shared/types/profile.ts`:**

```typescript
interface WorkExperience {
  id: string;
  companyName: string;
  companyLogo?: string;
  position: string;
  description?: string;
  industry?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  linkedBusinessId?: string;
  createdAt: string;
}

interface Education {
  id: string;
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  createdAt: string;
}

interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  createdAt: string;
}

interface Skill {
  id: string;
  name: string;
  category?: string;
}

interface UserSkill {
  id: string;
  skill: Skill;
  displayOrder: number;
}

interface ProfileCompleteness {
  percentage: number;
  completed: string[];
  missing: string[];
}

interface ProfessionalProfile extends User {
  headline?: string;
  bio?: string;
  industry?: string;
  coverPhoto?: string;
  profileSlug?: string;
  workExperiences: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  skills: UserSkill[];
  profileCompleteness?: ProfileCompleteness;
}
```

### 1.5 Frontend Service

**New: `src/features/profile/services/profile.service.ts`**

```typescript
// Work Experience
getExperiences(userId: string): Promise<WorkExperience[]>
addExperience(data: CreateWorkExperienceDTO): Promise<WorkExperience>
updateExperience(id: string, data: UpdateWorkExperienceDTO): Promise<WorkExperience>
deleteExperience(id: string): Promise<void>

// Education
getEducation(userId: string): Promise<Education[]>
addEducation(data: CreateEducationDTO): Promise<Education>
updateEducation(id: string, data: UpdateEducationDTO): Promise<Education>
deleteEducation(id: string): Promise<void>

// Certifications
getCertifications(userId: string): Promise<Certification[]>
addCertification(data: CreateCertificationDTO): Promise<Certification>
updateCertification(id: string, data: UpdateCertificationDTO): Promise<Certification>
deleteCertification(id: string): Promise<void>

// Skills
searchSkills(query: string): Promise<Skill[]>
getUserSkills(userId: string): Promise<UserSkill[]>
addSkill(name: string): Promise<UserSkill>
removeSkill(skillId: string): Promise<void>
reorderSkills(skillIds: string[]): Promise<void>

// Profile
getPublicProfile(slug: string): Promise<ProfessionalProfile>
getProfileCompleteness(): Promise<ProfileCompleteness>
```

---

## 2. Tasks Feature

### 2.1 Database Schema

**New model: Task**

```prisma
model Task {
  id                String      @id @default(uuid())
  businessId        String
  business          Business    @relation(fields: [businessId], references: [id], onDelete: Cascade)
  locationId        String?
  location          Location?   @relation(fields: [locationId], references: [id])
  title             String
  description       String?
  type              TaskType    @default(GENERAL)
  status            TaskStatus  @default(TODO)
  priority          TaskPriority @default(NORMAL)
  assignedToUserId  String?
  assignedByUserId  String?
  createdByUserId   String
  dueDate           DateTime?
  completedAt       DateTime?
  linkedOrderId     String?
  linkedDeliveryId  String?
  linkedInvoiceId   String?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@index([businessId, status])
  @@index([businessId, assignedToUserId])
  @@index([assignedToUserId])
}

enum TaskType {
  GENERAL
  DELIVERY
  ORDER
  INVOICE
  INVENTORY
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum TaskPriority {
  LOW
  NORMAL
  URGENT
}
```

### 2.2 Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies/:companyId/tasks` | List tasks (filterable by status, assignee, priority, type). Middleware: `requireAuth`, `requireCompanyMember`. |
| GET | `/api/companies/:companyId/tasks/:taskId` | Get single task. Middleware: `requireAuth`, `requireCompanyMember`. |
| POST | `/api/companies/:companyId/tasks` | Create task. Sets `createdByUserId` from `req.user.id`. Middleware: `requireAuth`, `requireCompanyMember`. |
| PATCH | `/api/companies/:companyId/tasks/:taskId` | Update task fields. Middleware: `requireAuth`, `requireCompanyMember`. |
| PATCH | `/api/companies/:companyId/tasks/:taskId/status` | Change task status. Middleware: `requireAuth`, `requireCompanyMember`. |
| DELETE | `/api/companies/:companyId/tasks/:taskId` | Delete task. Middleware: `requireAuth`, `requireCompanyMember`. |
| GET | `/api/users/me/tasks` | Get tasks assigned to current user across all businesses. Uses `req.user.id` — users can only see their own tasks. Middleware: `requireAuth`. |

**POST body:**
```json
{
  "title": "Restock warehouse shelves",
  "description": "Section B needs restocking from latest delivery",
  "type": "INVENTORY",
  "priority": "URGENT",
  "assignedToUserId": "user-uuid",
  "dueDate": "2026-04-15T09:00:00Z",
  "linkedDeliveryId": "delivery-uuid"
}
```

**Status transitions:**
```
TODO → IN_PROGRESS, CANCELLED
IN_PROGRESS → COMPLETED, CANCELLED, TODO
COMPLETED → TODO (reopen)
CANCELLED → TODO (reopen)
```

### 2.3 Frontend Screens

#### New: TasksScreen (Business Mode)

- **Header:** "Tasks" with filter icon
- **Stats row:** 3 cards — Todo count / In Progress count / Completed count (tappable to filter)
- **Filter bar:** All | Todo | In Progress | Completed | Overdue
- **Sort:** By due date (default) or priority or created date
- **List:** TaskCard components grouped by date
- **FAB:** "+ New Task" button
- **Pull-to-refresh** + pagination
- **Empty state:** "No tasks yet. Create your first task to get organized."

#### New: CreateTaskScreen

- Title (required, text input)
- Description (optional, multiline)
- Type picker: General / Delivery / Order / Invoice / Inventory
- Priority picker: Low / Normal / Urgent
- Assign to (staff member picker from business team)
- Due date (date + time picker)
- Link to entity (optional — search orders/deliveries/invoices to link)
- Save button

#### New: TaskDetailScreen

- Task title + status badge + priority badge
- Description
- Assigned to (avatar + name)
- Assigned by (avatar + name)
- Due date (with overdue indicator if past)
- Linked entity card (if linked to order/delivery/invoice — tappable to navigate)
- **Action buttons** (based on current status):
  - TODO: "Start" (→ IN_PROGRESS), "Cancel"
  - IN_PROGRESS: "Complete" (→ COMPLETED), "Cancel"
  - COMPLETED/CANCELLED: "Reopen" (→ TODO)
- Edit button (navigate to edit form)
- Delete button (with confirmation)

#### Modified: ActivityScreen (Personal Mode)

Currently shows only delivery assignments. Updated to also fetch and display:
- General tasks assigned to the user (`GET /api/users/:userId/tasks`)
- Merged with delivery activities, sorted by due date
- TaskCard already supports the `general` type

### 2.4 Frontend Types

**New types in `src/shared/types/task.ts`:**

```typescript
type TaskType = 'GENERAL' | 'DELIVERY' | 'ORDER' | 'INVOICE' | 'INVENTORY';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type TaskPriority = 'LOW' | 'NORMAL' | 'URGENT';

interface Task {
  id: string;
  businessId: string;
  locationId?: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToUserId?: string;
  assignedToUserName?: string;
  assignedToUserAvatar?: string;
  assignedByUserId?: string;
  assignedByUserName?: string;
  dueDate?: string;
  completedAt?: string;
  linkedOrderId?: string;
  linkedDeliveryId?: string;
  linkedInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2.5 Frontend Service

**New: `src/features/tasks/services/tasks.service.ts`**

```typescript
getTasks(businessId: string, filters?: TaskFilters): Promise<Task[]>
getTask(businessId: string, taskId: string): Promise<Task>
createTask(businessId: string, data: CreateTaskDTO): Promise<Task>
updateTask(businessId: string, taskId: string, data: UpdateTaskDTO): Promise<Task>
updateTaskStatus(businessId: string, taskId: string, status: TaskStatus): Promise<Task>
deleteTask(businessId: string, taskId: string): Promise<void>
getMyTasks(userId: string): Promise<Task[]>
```

---

## 3. Navigation Changes

**New screens to register in App.tsx RootStack:**

```
// Professional Profile
AddEducationScreen
EditEducationScreen        { educationId: string }
AddCertificationScreen
EditCertificationScreen    { certificationId: string }
SkillsManagementScreen
PublicProfileScreen         { slug: string }

// Tasks
TasksScreen
CreateTaskScreen
TaskDetailScreen            { taskId: string; businessId: string }
```

**Navigation types to add to `src/shared/types/navigation.ts`:**

```typescript
// Add to RootStackParamList:
AddEducation: undefined;
EditEducation: { educationId: string };
AddCertification: undefined;
EditCertification: { certificationId: string };
EditWorkExperience: { experienceId: string };  // Updated from { businessId: string }
SkillsManagement: undefined;
PublicProfile: { slug: string };
Tasks: undefined;
CreateTask: { businessId: string; linkedOrderId?: string; linkedDeliveryId?: string; linkedInvoiceId?: string };
EditTask: { taskId: string; businessId: string };
TaskDetail: { taskId: string; businessId: string };
```

---

## 4. Implementation Order

The build sequence matters because of dependencies:

1. **Prisma schema migration** — Add all 6 new models + User field extensions
2. **Backend: Profile CRUD endpoints** — experiences, education, certifications, skills, profile completeness, public profile
3. **Backend: Tasks CRUD endpoints** — tasks with status transitions
4. **Frontend: Types & Services** — TypeScript types + API service files
5. **Frontend: Profile screens** — PersonalProfileScreen redesign, education/certification/skills screens
6. **Frontend: Tasks screens** — TasksScreen, CreateTaskScreen, TaskDetailScreen
7. **Frontend: Navigation** — Register all new screens, update ActivityScreen
8. **Frontend: Work experience migration** — Update AddWorkExperience/EditWorkExperience to use new standalone endpoint

---

## 5. What This Does NOT Include

- Endorsements or recommendations (Phase 4)
- "People you may know" suggestions (Phase 4)
- Company pages (Phase 2)
- Job board (Phase 3)
- Content feed (Phase 4)
- Payment/billing integration (Phase 2)
- Push notifications for tasks (can be added incrementally)
