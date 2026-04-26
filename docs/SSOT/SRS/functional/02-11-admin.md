> **SRS shard:** `SRS/functional/02-11-admin.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.11 Admin Module (`modules/admin`)

#### 2.11.1 Dynamic Admin Tables

- **Description:** User-defined database tables for admin data management
- **Controller prefix:** `/api/admin/tables`
- **Guard:** `AdminAuthGuard` on entire controller
- **Endpoints:**
  - `GET /api/admin/tables` — list tables
  - `GET /api/admin/tables/:id` — get table
  - `POST /api/admin/tables` — create table definition
  - `PUT /api/admin/tables/:id` — update table definition
  - `DELETE /api/admin/tables/:id` — delete table
  - `GET /api/admin/tables/:id/rows` — list table rows
  - `POST /api/admin/tables/:id/rows` — add row
  - `PUT /api/admin/tables/:id/rows/:rowId` — update row
  - `DELETE /api/admin/tables/:id/rows/:rowId` — delete row
- **Database:**
  - `admin_tables` — table definitions
  - `admin_table_columns` — column definitions with type constraint (text, number, date)
  - `admin_table_rows` — row data stored as JSONB

#### 2.11.2 Admin Files

- **Controller prefix:** `/api/admin-files`
- **Endpoints:**
  - `GET /api/admin-files` — list files (`JwtAuthGuard`)
  - `GET /api/admin-files/folders` — list folders (`JwtAuthGuard`)
  - `POST /api/admin-files` — upload file (`JwtAuthGuard` + `AdminAuthGuard`)
  - `DELETE /api/admin-files/:id` — delete file (`JwtAuthGuard` + `AdminAuthGuard`)

#### 2.11.3 CRM

- **Controller prefix:** `/api/crm`
- **Endpoints:**
  - `GET /api/crm` — list CRM contacts
  - `POST /api/crm` — create contact
  - `PATCH /api/crm/:id` — update contact
  - `DELETE /api/crm/:id` — delete contact

#### 2.11.4 Task Management

- **Description:** Hierarchical task system with time logging
- **Controller prefix:** `/api/tasks`
- **Endpoints:**
  - `GET /api/tasks` — list tasks
  - `GET /api/tasks/init-table` — initialize tasks schema
  - `GET /api/tasks/:id` — get task
  - `GET /api/tasks/:id/subtasks` — list subtasks
  - `GET /api/tasks/:id/tree` — full task subtree
  - `POST /api/tasks` — create task (`JwtAuthGuard`)
  - `POST /api/tasks/:id/log-hours` — log time (`JwtAuthGuard`)
  - `PATCH /api/tasks/:id` — update task (`AdminAuthGuard`)
  - `DELETE /api/tasks/:id` — delete task (`AdminAuthGuard`)
  - `GET /api/tasks/hours-report/:managerId` — time report (`AdminAuthGuard`)
- **Task fields:** title, description, status (todo, in_progress, review, done, blocked), priority (low, medium, high, urgent), parent_task_id, assignees (TEXT[]), tags (TEXT[]), due_date, estimated_hours
- **Time logging:** `task_time_logs` with unique `(task_id, user_id)`, CHECK `actual_hours > 0`

#### 2.11.5 Community Members

- **Controller prefix:** `/api/community-members`
- **Endpoints:**
  - `GET /api/community-members` — list members
  - `GET /api/community-members/:id` — get member
  - `POST /api/community-members` — add member
  - `PATCH /api/community-members/:id` — update member
  - `DELETE /api/community-members/:id` — delete member