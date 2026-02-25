# System Requirements Document - Karma Community

**Version:** 1.0  
**Date:** February 17, 2026  
**Status:** Draft

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Functional Requirements](#functional-requirements)
4. [User Management and Authentication](#user-management-and-authentication)
5. [Donations Module](#donations-module)
6. [Carpooling/Rides Module](#carpoolingrides-module)
7. [Tasks and Project Management Module](#tasks-and-project-management-module)
8. [Community Challenges Module](#community-challenges-module)
9. [Posts and Feed Module](#posts-and-feed-module)
10. [Chat and Messaging Module](#chat-and-messaging-module)
11. [Notifications Module](#notifications-module)
12. [Admin Management Module](#admin-management-module)
13. [Statistics and Analytics Module](#statistics-and-analytics-module)
14. [Security Requirements](#security-requirements)
15. [Performance Requirements](#performance-requirements)
16. [UI/UX Requirements](#uiux-requirements)
17. [External Integrations](#external-integrations)

---

## Introduction

### System Description
**Karma Community** is a social community platform that connects people for donations, collaborations, and mutual aid. The system enables users to donate time, money, items, and services, manage group tasks, participate in community challenges, and communicate directly.

### System Goals
- Create a connected social community based on mutual aid and karma
- Enable diverse donations: money, items, services, time, knowledge, and rides
- Manage tasks and projects collaboratively
- Track personal and group contributions
- Create community engagement through challenges and activities

### System Scope
- **Supported Platforms:** Web (React Native Web), iOS (Expo), Android (Expo)
- **Language Support:** Hebrew (RTL), English (LTR)
- **Deployment Environments:**
  - **Production (main):** karma-community-kc.com
  - **Development (dev):** dev.karma-community-kc.com

---

## System Architecture

### Technology Stack

#### Backend (Server)
- **Framework:** NestJS 10.x
- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.4+
- **Database:** PostgreSQL 14+ (with UUID extension, pg_trgm for full-text search)
- **Cache:** Redis 5+ (via ioredis)
- **Authentication:** 
  - Firebase Admin SDK 12.7
  - Google OAuth 2.0 (google-auth-library)
  - JWT tokens (custom implementation)
  - Argon2 password hashing
- **Security:**
  - Helmet.js for HTTP headers
  - CORS configuration
  - Rate limiting (NestJS Throttler)
  - Input validation (class-validator, class-transformer)

#### Frontend (Client)
- **Framework:** React Native 0.80 + Expo SDK 53
- **Language:** TypeScript 5.8
- **Navigation:** React Navigation 7
- **State Management:** Zustand 5.0
- **HTTP Client:** Axios 1.13
- **UI Components:**
  - React Native core components
  - Expo vector icons
  - Custom component library
- **Animations:** React Native Reanimated 3.19
- **Graphics:** Shopify React Native Skia 2.0
- **Localization:** i18next 25.3 + react-i18next 15.6

### Database Structure

#### Main Tables

1. **user_profiles** - Users
   - UUID primary key
   - Firebase UID + Google ID for authentication
   - Profile information, roles, settings
   - Hierarchy (parent_manager_id)
   - Salary and seniority tracking

2. **organizations** - Organizations
   - Organization management
   - Verification status
   - Creator tracking

3. **donations** - Donations
   - Multiple types: money, item, service, time, trump
   - Category linkage
   - Status tracking
   - Location and metadata

4. **rides** - Carpooling/Rides
   - Driver and passenger management
   - Location-based (from/to with coordinates)
   - Seat availability tracking

5. **tasks** - Tasks
   - Hierarchical tasks (parent-child)
   - Multiple assignees
   - Status, priority, category
   - Time tracking integration

6. **posts** - Posts
   - Generic post system
   - Links to tasks, rides, items
   - Like and comment counts
   - Author tracking

7. **chat_conversations** - Conversations
   - Direct and group chats
   - Participant array (UUID[])
   - Last message tracking

8. **chat_messages** - Messages
   - Multiple message types (text, image, file, voice, location)
   - Reply-to support
   - Edit/delete tracking

9. **challenges** - Personal Challenges (for admins)
10. **community_group_challenges** - Community Group Challenges
11. **items** - Items for Donation
12. **community_members** - Community Members (administrative records)
13. **admin_tables** - Dynamic Admin Tables
14. **manager_volunteer_invitations** - Volunteer Assignment Invitations

#### Table Relationships
- Foreign keys with ON DELETE CASCADE/SET NULL
- GIN indexes for arrays and JSONB fields
- Full-text search indexes (pg_trgm)
- Automatic triggers for updated_at timestamps

### Cloud Infrastructure

#### Deployment
- **Platform:** Railway.app
- **Database:** PostgreSQL managed instance
- **Redis:** Redis managed instance
- **Storage:** Firebase Storage (for images/files)
- **CI/CD:** GitHub Actions (implied by .github folder)

#### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `FIREBASE_*` - Firebase configuration
- `NODE_ENV` - Environment (development/production)

---

## Functional Requirements

### FR-001: User Management and Authentication

#### FR-001.1: User Registration
- **Description:** The system will allow new users to register in three ways
- **Registration Methods:**
  1. **Google OAuth:**
     - Login via Google account
     - Server-side token verification
     - Email verified check
     - Generate unique UUID for user
     - Store Google ID and Firebase UID separately
  2. **Email/Password:**
     - Enter email and password (minimum 6 characters)
     - Password hashing using Argon2
     - Email validity verification
     - Send email verification (future plan)
  3. **Guest Mode:**
     - Login without registration
     - Limited access to features
     - No long-term data storage

#### FR-001.2: Login
- **Description:** Registered users can log into the system
- **Login Methods:**
  1. Email/Password - Verification against hash in database
  2. Google OAuth - Token verification and user recovery/creation
  3. Firebase Auth State - Automatic session recovery

#### FR-001.3: Session Management
- **JWT Tokens:**
  - Access Token (short-lived - 15 minutes)
  - Refresh Token (long-lived - 7 days)
  - Automatic Access Token refresh
  - Secure storage in AsyncStorage (mobile) / LocalStorage (web)
- **Firebase Auth State Listener:**
  - Automatic user state updates
  - Sync with backend

#### FR-001.4: Profile Management
- **Description:** Users can manage their personal profile
- **Profile Fields:**
  - Full name
  - Profile picture
  - Biography (bio)
  - Location (city, country)
  - Interests (tags)
  - Phone number
  - Settings (language, Dark mode, notifications, privacy)
- **Actions:**
  - Edit profile
  - Upload profile picture
  - View other users' profiles
  - Update settings

#### FR-001.5: Permissions System (Roles)
- **Description:** The system will support a complex permission hierarchy
- **Roles:**
  1. **user** - Regular user (no management permissions)
  2. **volunteer** - Volunteer (user assigned to a manager)
  3. **admin** - Community volunteer manager (user with volunteers under them)
  4. **org_admin** - Organization manager (organization user)
  5. **super_admin** - Main administrator of the entire application
  
- **Permissions by Role:**
  - `user`: Basic access to all user features, no management permissions
  - `volunteer`: Like user + assigned to manager, can cancel assignment at any time
  - `admin`: Like user + manage volunteers (assign/unassign), view volunteer activities
  - `org_admin`: Manage organization, approve requests, manage organization members
  - `super_admin`: Full access to all management interfaces, statistics, users, global hierarchical structure

#### FR-001.6: Management Hierarchy
- **Description:** Support for hierarchical management structure with strict constraints
- **Features:**
  - `parent_manager_id` - Direct manager (manager's UUID)
  - Acyclic hierarchy (Acyclic Directed Graph)
  - Each volunteer can be assigned to only one manager at a time
  - Track salary and seniority (salary, seniority_start_date)
  - Display hierarchy tree in management screen

- **Assignment Rules:**
  1. **Volunteer Assignment to Manager:**
     - Only `admin` or `super_admin` can assign user to manager
     - Two-step process:
       - Manager sends assignment request (invitation)
       - User must approve the assignment (accept invitation)
     - After approval, user gets role = 'volunteer' (in addition to 'user')
     - `parent_manager_id` updates to manager's UUID
  
  2. **Unassignment:**
     - **The volunteer themselves** can cancel assignment at any time (self-unassign)
     - **Direct manager** can cancel their volunteer's assignment
     - **Senior manager** (manager's manager) can cancel junior manager's volunteer assignment
     - **super_admin** can cancel any assignment
     - On unassignment:
       - `parent_manager_id` = NULL
       - 'volunteer' role removed from roles array
  
  3. **Cycle Prevention:**
     - On assignment, system checks for no cycle:
       - A cannot be manager of B if B is manager (direct or indirect) of A
     - Algorithm: Recursive traversal up the entire hierarchy chain
     - Example:
       ```
       A (manager) → B (volunteer)
       B (manager) → C (volunteer)
       ❌ Forbidden: C (manager) → A (creates cycle)
       ```
  
  4. **Limitations:**
     - Volunteer cannot be admin (manager) of other volunteers - **unless special approval**
     - If volunteer wants to be manager, `super_admin` must approve and promote to `admin`
     - Manager can also be volunteer (can be both `admin` and `volunteer` simultaneously)

- **Data Structure:**
  ```typescript
  // user_profiles table
  {
    id: UUID,
    roles: ['user', 'volunteer', 'admin', 'org_admin', 'super_admin'],
    parent_manager_id: UUID | null, // Direct manager
    manager_since: TIMESTAMPTZ, // When became manager
    volunteer_since: TIMESTAMPTZ, // When became volunteer
    salary: DECIMAL, // Salary (for managers)
    seniority_start_date: DATE // Seniority start date
  }
  
  // manager_volunteer_invitations (new table)
  {
    id: UUID,
    manager_id: UUID, // Manager sending invitation
    user_id: UUID, // User invited to be volunteer
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled',
    created_at: TIMESTAMPTZ,
    responded_at: TIMESTAMPTZ
  }
  ```

- **Required Endpoints:**
  - `POST /api/managers/invite-volunteer` - Send volunteer invitation (admin/super_admin)
  - `POST /api/volunteers/accept-invitation/:id` - Accept invitation (user)
  - `POST /api/volunteers/reject-invitation/:id` - Reject invitation (user)
  - `DELETE /api/volunteers/unassign` - Self-unassign (volunteer)
  - `DELETE /api/managers/:managerId/volunteers/:volunteerId` - Unassign (manager/super_admin)
  - `GET /api/managers/my-volunteers` - List my volunteers (admin)
  - `GET /api/hierarchy/tree` - Full hierarchy tree (super_admin)
  - `GET /api/hierarchy/validate-assignment` - Validate assignment (cycle prevention)

#### FR-001.7: Volunteer Invitation Process
- **Description:** Two-step process for assigning volunteer to manager
- **Table:** `manager_volunteer_invitations`
- **Fields:**
  - `id` (UUID) - Invitation ID
  - `manager_id` (UUID) - Manager sending invitation
  - `user_id` (UUID) - User being invited
  - `status` - Invitation status
  - `message` (TEXT) - Personal message from manager (optional)
  - `created_at` - Creation date
  - `responded_at` - Response date
  - `expires_at` - Expiration date (14 days from creation)

- **Statuses:**
  - `pending` - Awaiting response
  - `accepted` - Approved by user
  - `rejected` - Rejected by user
  - `cancelled` - Cancelled by manager
  - `expired` - Expired (14 days without response)

- **Process:**
  1. **Send Invitation (admin/super_admin):**
     - `POST /api/managers/invite-volunteer`
     - Body: `{ userId: UUID, message?: string }`
     - Validations:
       - Manager must be admin/super_admin
       - User cannot already be volunteer of another manager
       - No existing pending invitation from same manager to same user
     - Creates record in `manager_volunteer_invitations`
     - Sends notification to user
  
  2. **View Invitations (user):**
     - `GET /api/volunteers/my-invitations`
     - Returns list of pending invitations
     - Display in UI: Modal/screen with manager details + message
  
  3. **Accept Invitation (user):**
     - `POST /api/volunteers/accept-invitation/:invitationId`
     - Update `status = 'accepted'`, `responded_at = NOW()`
     - Update `user_profiles`:
       - Add 'volunteer' role to `roles` array
       - Update `parent_manager_id = manager_id`
       - Update `volunteer_since = NOW()`
     - Send notification to manager
     - Automatically cancel all other pending invitations for same user
  
  4. **Reject Invitation (user):**
     - `POST /api/volunteers/reject-invitation/:invitationId`
     - Update `status = 'rejected'`, `responded_at = NOW()`
     - Send notification to manager
  
  5. **Cancel Invitation (manager):**
     - `DELETE /api/managers/invitations/:invitationId`
     - Only if `status = 'pending'`
     - Update `status = 'cancelled'`
     - Send notification to user

- **Automatic Expiration:**
  - Daily cron job: Marks `status = 'expired'` for invitations over 14 days in pending state
  - Notification to user about expired invitation

- **UI/UX:**
  - Badge on notifications icon with number of pending invitations
  - Special modal for invitations: "👤 [Manager name] invites you to be a volunteer"
  - Buttons: "Accept Invitation" / "Decline"

#### FR-001.8: Volunteer Unassignment
- **Description:** Process to cancel relationship between volunteer and manager
- **Who Can Unassign:**
  1. **The volunteer themselves** - `DELETE /api/volunteers/unassign`
  2. **Direct manager** - `DELETE /api/managers/my-volunteers/:volunteerId`
  3. **Senior manager** - `DELETE /api/managers/:managerId/volunteers/:volunteerId`
     - Only if `managerId` is junior manager under senior manager
  4. **super_admin** - `DELETE /api/managers/:managerId/volunteers/:volunteerId`
     - No restrictions

- **Unassignment Process:**
  1. Validations:
     - Check permissions (as above)
     - Volunteer actually assigned to this manager
  2. Update `user_profiles`:
     - `parent_manager_id = NULL`
     - Remove 'volunteer' role from `roles` array
     - `volunteer_since = NULL`
  3. Send notifications:
     - To volunteer (if they didn't cancel)
     - To manager (if they didn't cancel)
  4. Log in `user_activities`:
     - `activity_type = 'volunteer_unassigned'`
     - `activity_data = { manager_id, volunteer_id, unassigned_by }`

- **UI:**
  - "Unassign" button in volunteer screen (for volunteer themselves)
  - "Remove Volunteer" button in volunteer management screen (for manager)
  - Confirmation modal: "Are you sure you want to cancel this assignment?"

---

### FR-002: Donations Module

#### FR-002.1: Donation Categories
- **Description:** The system will support 33 donation categories
- **Main Categories:**
  1. Money
  2. Items
  3. Time/Volunteering
  4. Knowledge
  5. Trump/Rides
  
- **Additional Categories:**
  - Food
  - Clothes
  - Books
  - Furniture
  - Medical
  - Animals
  - Housing
  - Support (Emotional)
  - Education
  - Environment
  - Technology
  - Music
  - Games
  - Riddles
  - Recipes
  - Plants
  - Waste
  - Art
  - Sports
  - Dreams
  - Fertility
  - Jobs
  - Matchmaking
  - Mental Health
  - Golden Age
  - Languages
  - Community Challenges

#### FR-002.2: Creating Donations
- **Description:** Users can create new donations
- **Required Fields:**
  - Title
  - Description
  - Category (category_id)
  - Type (money/item/service/time/trump)
- **Optional Fields:**
  - Amount - for money donations
  - Currency - default ILS
  - Location (city, address, coordinates)
  - Images (images[])
  - Tags (tags[])
  - Expiration date (expires_at)
  - Metadata - category-specific data
- **Statuses:**
  - active - Active
  - completed - Completed
  - cancelled - Cancelled
  - expired - Expired

#### FR-002.3: Searching and Browsing Donations
- **Description:** Users can search and browse donations
- **Search Options:**
  - By category
  - By location (city)
  - By tags
  - Free text search in title/description (full-text search)
  - Filter by status
- **Display:**
  - List view
  - Grid view (1-3 columns)
  - Sort: date, popularity, proximity

#### FR-002.4: Tracking Donations
- **Description:** The system will track user donations
- **Stored Data:**
  - total_donations_amount - Total money donations
  - total_volunteer_hours - Total volunteer hours
  - karma_points - Karma points (based on donations)
- **Statistics:**
  - Donations by category
  - Donations by period
  - Community comparison

---

### FR-003: Items Donation Module

#### FR-003.1: Item Management
- **Description:** Dedicated system for managing physical items for donation
- **Item Properties:**
  - Title
  - Description
  - Category (furniture, clothes, electronics, general)
  - Condition (new, like_new, used, for_parts)
  - Location (city, address, coordinates)
  - Price (0 = free)
  - Image (image_base64)
  - Rating
  - Tags
  - Quantity
  - Status (available, reserved, delivered, expired, cancelled)
  - Delivery method (pickup, delivery, shipping)

#### FR-003.2: Item Search
- **Description:** Advanced item search
- **Options:**
  - Search by title/description (pg_trgm)
  - Filter by category
  - Filter by condition
  - Filter by location
  - Filter by price
  - Filter by tags

#### FR-003.3: Item Delivery Requests
- **Description:** System for managing item delivery requests
- **Process:**
  1. User requests item (item_request)
  2. Owner approves/rejects
  3. Coordinate delivery time and location
  4. Mark as completed
- **Statuses:**
  - pending - Waiting
  - approved - Approved
  - rejected - Rejected
  - scheduled - Scheduled
  - completed - Completed
  - cancelled - Cancelled
- **Data:**
  - Message from requester
  - Proposed time (proposed_time)
  - Delivery method
  - Meeting location
  - Owner response

#### FR-003.4: Item Delivery Posts
- **Description:** Automatic post creation for item deliveries
- **Triggers:**
  - When item delivered (status = delivered) → create post type item_delivered
- **Post Content:**
  - Item details
  - Giver and receiver
  - Images
  - Location

---

### FR-004: Carpooling/Rides Module

#### FR-004.1: Creating Ride
- **Description:** Users can offer carpooling/rides
- **Required Fields:**
  - Title
  - From location (name, city, coordinates)
  - To location (name, city, coordinates)
  - Departure time
  - Available seats
- **Optional Fields:**
  - Estimated arrival time
  - Price per seat
  - Description
  - Requirements (smoking, pets, etc.)
- **Statuses:**
  - active - Active
  - full - Full
  - cancelled - Cancelled
  - completed - Completed

#### FR-004.2: Ride Booking
- **Description:** Passengers can book seats in rides
- **Process:**
  1. Select ride
  2. Number of seats requested (seats_requested)
  3. Message to driver (optional)
  4. Wait for driver approval
- **Statuses:**
  - pending - Awaiting approval
  - approved - Approved
  - rejected - Rejected
  - cancelled - Cancelled
- **Constraints:**
  - UNIQUE(ride_id, passenger_id) - Passenger can book once per ride

#### FR-004.3: Ride Management
- **Driver Actions:**
  - Update ride details
  - Approve/reject requests
  - Cancel ride
  - Mark ride as completed
- **Passenger Actions:**
  - View my booked rides
  - Cancel booking
  - Rate driver (future plan)

#### FR-004.4: Ride Search
- **Description:** Advanced ride search
- **Options:**
  - By origin (GIN index on from_location)
  - By destination (GIN index on to_location)
  - By departure date
  - By available seats
  - Sort by: date, price, available seats

#### FR-004.5: Ride Posts
- **Description:** Automatic post creation for rides
- **Triggers:**
  - New ride → post type ride_offered
  - Ride completed → post type ride_completed
- **Content:**
  - Ride details
  - Driver and passengers
  - Route

---

### FR-005: Tasks and Project Management Module

#### FR-005.1: Creating Tasks
- **Description:** Managers can create tasks for team
- **Required Fields:**
  - Title
  - Description
  - Status
  - Priority
- **Optional Fields:**
  - Category (development, marketing, operations, etc.)
  - Due date
  - Assignees (UUID[])
  - Tags (TEXT[])
  - Checklist (JSONB: [{id, text, done}])
  - Parent task (parent_task_id) - for subtasks
  - Estimated hours

#### FR-005.2: Task Statuses and Updates
- **Possible Statuses:**
  - open - Open
  - in_progress - In Progress
  - stuck - Stuck
  - testing - Testing
  - done - Done
  - archived - Archived
- **Priorities:**
  - low - Low
  - medium - Medium
  - high - High
- **Actions:**
  - Update status
  - Add/remove assignees
  - Update checklist
  - Update dates and priority

#### FR-005.3: Task Hierarchy
- **Description:** Support for subtasks
- **Features:**
  - parent_task_id - Link to parent task
  - ON DELETE CASCADE - Deleting parent deletes children
  - Hierarchical display in interface

#### FR-005.4: Work Hours Tracking
- **Description:** Log actual work hours for tasks
- **Table:** task_time_logs
- **Fields:**
  - task_id
  - user_id
  - actual_hours (must be > 0)
  - logged_at
- **Constraints:**
  - UNIQUE(task_id, user_id) - User can log hours once per task
- **Uses:**
  - Compare estimated_hours vs actual_hours
  - Time reports for managers
  - Salary calculation (integration with salary)

#### FR-005.5: Task Posts
- **Description:** Automatic post creation for tasks
- **Triggers:**
  - Task assigned → post type task_assignment
  - Task completed → post type task_completion
- **Content:**
  - Task details
  - Assignees
  - Status

---

### FR-006: Challenges Module

#### FR-006.1: Personal Challenges
- **Description:** System for tracking personal challenges for admins
- **Table:** challenges
- **Uses:**
  - Timers
  - Daily habit tracking
  - Personal goals

#### FR-006.2: Community Group Challenges
- **Description:** Group challenges for entire community
- **Table:** community_group_challenges
- **Features:**
  - Title and description
  - Start and end dates
  - Participants
  - Goals
  - Progress tracking
- **Interfaces:**
  - Active challenges list
  - Join challenge
  - Track progress
  - Challenge statistics

#### FR-006.3: Daily Habits Tracking
- **Description:** System for daily habit tracking
- **Components:**
  - `HabitsTrackerTable` - Weekly/monthly table
  - `HabitsTrackerCell` - Single cell (day + habit)
  - `DailyHabitsQuickView` - Quick view of today
  - `HabitsStatsCard` - Statistics card
- **Actions:**
  - Mark habit as completed
  - Update records (EditEntryModal)
  - View history

#### FR-006.4: Challenge Management Screens
- **Screens:**
  - `MyChallengesScreen` - Challenges I'm participating in
  - `MyCreatedChallengesScreen` - Challenges I created
  - `ChallengeDetailsScreen` - Challenge details + participants
  - `ChallengeStatisticsScreen` - Detailed statistics
  - `CommunityChallengesScreen` - Active community challenges

---

### FR-007: Posts and Feed Module

#### FR-007.1: Post Types
- **Description:** The system will support various post types
- **Types:**
  - `general_update` - General update
  - `task_completion` - Task completed
  - `task_assignment` - Task assigned
  - `donation` - Donation
  - `ride_offered` - Ride offered
  - `ride_completed` - Ride completed
  - `item_delivered` - Item delivered
  - `challenge_update` - Challenge update

#### FR-007.2: Creating Posts
- **Fields:**
  - Title
  - Description
  - Images (TEXT[])
  - Post type
  - Links to entities: task_id, ride_id, item_id
  - Metadata (JSONB)
- **Actions:**
  - Manual creation
  - Automatic creation (triggers)
  - Edit (EditPostModal)
  - Delete (author only)

#### FR-007.3: Likes and Comments
- **Likes:**
  - Table: post_likes
  - UNIQUE(post_id, user_id)
  - Automatic update of likes counter in posts table (trigger)
  - Display number of likes
  - Highlighted icon if user liked
  
- **Comments:**
  - Table: post_comments
  - Fields: text (1-2000 chars), user_id, likes_count
  - Automatic update of comments counter (trigger)
  - Comment likes (comment_likes)
  - Edit/delete comments (author only)
  - CommentsModal for display and adding

#### FR-007.4: Feed Display
- **Views:**
  - List View - Vertical list
  - Grid View - Grid of 1-3 columns
  - Reels Mode - Vertical scroll through posts
- **Feed Modes:**
  - Friends - Posts from people I follow
  - Discovery - Popular/new posts from entire community
- **Features:**
  - Pull-to-refresh
  - Infinite scroll (pagination)
  - Filter by post type
  - Sort (new → old, popular)

#### FR-007.5: Post Interactions
- **Actions:**
  - Like/unlike
  - Comment
  - Share (future plan)
  - Report (ReportPostModal)
  - Hide (Hide post)
  - Delete (author/admin only)
  - Edit (author only)
- **Options Menu (OptionsModal):**
  - Edit
  - Delete
  - Report
  - Hide
  - Copy link

#### FR-007.6: Post Cards
- **Description:** Each post type displayed with dedicated design
- **Components:**
  - `RegularItemCard` - Regular post
  - `DonationItemCard` - Donation post
  - `ItemDeliveredCard` - Item delivered
  - `TaskCompletionCard` - Task completed
  - `TaskAssignmentCard` - Task assigned
  - `RideCompletedCard` - Ride completed
  - `RideOfferedCard` - Ride offered
- **Common Features:**
  - Author picture + name
  - Post images
  - Like/comment/share buttons
  - Date
  - Description

---

### FR-008: Chat and Messaging Module

#### FR-008.1: Conversations
- **Description:** Managing conversations between users
- **Conversation Types:**
  - direct - Direct chat (2 participants)
  - group - Group (3+ participants)
- **Fields:**
  - Title (optional, for groups)
  - Participants (UUID[])
  - Creator (created_by)
  - Last message (last_message_id, last_message_at)
- **Actions:**
  - Create new conversation
  - Add participants (groups)
  - Remove participants (groups)
  - Delete conversation

#### FR-008.2: Messages
- **Message Types:**
  - text - Text
  - image - Image
  - file - File
  - voice - Voice message
  - location - Location
  - donation - Link to donation
- **Fields:**
  - Content - for text
  - File (file_url, file_name, file_size, file_type)
  - Metadata - for location, donation, etc.
  - Reply to message (reply_to_id)
  - Edit (is_edited, edited_at)
  - Delete (is_deleted, deleted_at)
- **Actions:**
  - Send message
  - Edit message
  - Delete message
  - Reply to message
  - Upload files (image/video/document)

#### FR-008.3: Read Receipts
- **Description:** Tracking read messages
- **Table:** message_read_receipts
- **Fields:**
  - message_id
  - user_id
  - read_at
- **Constraints:**
  - UNIQUE(message_id, user_id)
- **Features:**
  - Automatic mark as read on entering chat
  - Display "read" on messages
  - Count unread messages

#### FR-008.4: Real-time Updates
- **Description:** Automatic chat updates
- **Mechanisms:**
  - Firestore Listeners (if available)
  - Polling (fallback) - every X seconds
- **Subscriptions:**
  - `subscribeToMessages(conversationId)` - Message updates in conversation
  - `subscribeToConversations()` - Conversation list updates
- **Updates:**
  - New message → Add to list
  - Message edited → Update
  - Message deleted → Mark/remove
  - New conversation → Add to list

#### FR-008.5: User Interface
- **Screens:**
  - `ChatListScreen` - Conversations list
  - `ChatDetailScreen` - Chat conversation
  - `NewChatScreen` - Create new conversation
- **Components:**
  - `ChatListItem` - Item in conversations list
  - `ChatMessageBubble` - Message bubble
- **UI Features:**
  - Badge with unread message count
  - Display last message
  - Display relative time
  - Highlight unread messages
  - "typing..." indicator

#### FR-008.6: File Upload in Chat
- **File Types:**
  - Images (JPEG, PNG, GIF, WebP)
  - Videos (MP4, WebM)
  - Documents (PDF, DOC, XLS, etc.)
- **Process:**
  1. Select file (expo-image-picker / expo-document-picker)
  2. Validation (size, type)
  3. Upload to Firebase Storage with progress
  4. Save URL in message
- **Limitations:**
  - Images: up to 10MB
  - Videos: up to 50MB
  - Documents: up to 20MB

---

### FR-009: Notifications Module

#### FR-009.1: Notification Types
- **Description:** The system will send notifications to users
- **Types:**
  - `message` - New chat message
  - `donation` - New donation/update
  - `ride` - Ride request/update
  - `task` - Task assignment/update
  - `challenge` - Challenge update
  - `event` - Community event
  - `system` - System message
  - `like` - Someone liked my post
  - `comment` - Comment on my post

#### FR-009.2: Sending Notifications
- **Channels:**
  - In-app notifications (table: user_notifications)
  - Push notifications (Expo Notifications)
  - Email (future plan)
- **Fields:**
  - user_id
  - title
  - content
  - notification_type
  - related_id - Related entity ID
  - is_read
  - metadata (JSONB)

#### FR-009.3: Notification Management
- **Actions:**
  - Mark as read
  - Mark all as read
  - Delete notification
  - Notification settings (in user settings)
- **Settings:**
  - notifications_enabled (true/false)
  - Notifications by type (message, donation, etc.)
  - Quiet hours (Do Not Disturb)

#### FR-009.4: Badge and Counter
- **Description:** Display unread notification count
- **Locations:**
  - Badge on Notifications icon in top bar
  - Counter in notifications screen
- **Update:**
  - Refresh every X seconds
  - Real-time update on app entry
- **Hook:** `useUnreadNotificationsCount()`

#### FR-009.5: Notifications Screen
- **Screen:** `NotificationsScreen`
- **Display:**
  - Notifications list (new → old)
  - Distinguish read/unread (highlight)
  - Link to related entity (post, chat, task, etc.)
  - "Mark all as read" button
- **Interaction:**
  - Tap notification → Mark as read + navigate to entity
  - Swipe to delete

---

### FR-010: Admin Management Module

#### FR-010.1: Admin Dashboard
- **Screen:** `AdminDashboardScreen`
- **Access:** Only users with role = 'admin'
- **Content:**
  - Links to management screens
  - Quick statistics
  - Management notifications

#### FR-010.2: User Management
- **Screen:** `AdminPeopleScreen`
- **Access:** 
  - `admin`: See only their volunteers
  - `super_admin`: See all users and full structure
  
- **Actions (super_admin only):**
  - View all users list
  - Search users
  - Edit profiles
  - Promote user to admin/super_admin (promoteToAdmin)
  - Demote from admin/super_admin (demoteAdmin)
  - Display full hierarchy tree (AdminHierarchyTree)
  - Block/unblock users

- **Actions (admin):**
  - Send volunteer invitations (invite-volunteer)
  - View only their volunteers
  - Unassign their volunteer
  - Update salary and seniority of their volunteers
  - Display hierarchy tree of their volunteers

- **Constraints:**
  - admin cannot assign/unassign volunteers of another admin
  - admin cannot promote users to roles
  - Only super_admin can promote/demote roles

#### FR-010.3: Task Management
- **Screen:** `AdminTasksScreen`
- **Actions:**
  - View all tasks
  - Create new tasks
  - Assign tasks
  - Update statuses
  - View work hours (task_time_logs)
  - Manage subtasks

#### FR-010.4: CRM Management
- **Screen:** `AdminCRMScreen`
- **Description:** Customer and community relationship management
- **Actions:**
  - Manage community_members records
  - Track donations
  - Statuses (active/inactive)

#### FR-010.5: File Management
- **Screen:** `AdminFilesScreen`
- **Description:** Manage shared files for admins
- **Actions:**
  - Upload files
  - Download files
  - Delete files
  - Share files

#### FR-010.6: Dynamic Tables Management
- **Screens:**
  - `AdminTablesScreen` - Tables list
  - `AdminTableRowsScreen` - Table rows
- **Tables:**
  - `admin_tables` - Table definitions
  - `admin_table_columns` - Table columns
  - `admin_table_rows` - Data rows
- **Column Types:**
  - text
  - number
  - date
- **Actions:**
  - Create new table
  - Add columns
  - Add/edit/delete rows
  - Export data (future plan)

#### FR-010.7: Finance and Time Management
- **Screens:**
  - `AdminMoneyScreen` - Money donations management
  - `AdminTimeManagementScreen` - Work hours management
- **Actions:**
  - View reports
  - Track payments
  - Manage salary (salary integration)

#### FR-010.8: Approvals and Reviews
- **Screens:**
  - `AdminReviewScreen` - Reviews
  - `AdminOrgApprovalsScreen` - Organization approvals
- **Actions:**
  - Approve/reject organization requests (organization_applications)
  - Review donations/items/rides
  - Manage reports

#### FR-010.9: Hierarchy Tree
- **Component:** `AdminHierarchyTree`
- **Description:** Visual display of management structure
- **Features:**
  - Display all managers and volunteers under them
  - parent_manager_id relationships
  - Highlight role types (super_admin, admin, volunteer)
  - Hierarchy depth level
  
- **Display:**
  ```
  📊 Super Admin
  ├── 👤 Admin A
  │   ├── 🙋 Volunteer 1
  │   ├── 🙋 Volunteer 2
  │   └── 👤 Admin B (Junior manager under A)
  │       ├── 🙋 Volunteer 3
  │       └── 🙋 Volunteer 4
  ├── 👤 Admin C
  │   └── 🙋 Volunteer 5
  └── 🏢 Org Admin (Not part of volunteer hierarchy)
  ```

- **Actions (super_admin only):**
  - Promote user to admin
  - Demote admin to user
  - Cancel any assignment
  - Reassign volunteer from manager to manager
  
- **Actions (admin):**
  - View only their branch
  - Invite new volunteers
  - Unassign their direct volunteer

- **Displayed Constraints:**
  - Cycle prevention - System shows warning if trying to create cycle
  - Depth limit (optional) - e.g., maximum 5 levels
  - Volunteer can only be under one manager

---

### FR-011: Statistics and Analytics Module

#### FR-011.1: Community Statistics
- **Screen:** `CommunityStatsScreen`
- **Data:**
  - Total users (totalUsers)
  - Total donations (totalDonations)
  - Total volunteer hours (totalVolunteerHours)
  - Total money donated (totalMoneyDonated)
  - Donations by category
  - Activity over time (trends)
  - Active users
- **Table:** community_stats
- **Aggregation:**
  - By statistic type (stat_type)
  - By city
  - By period (date_period)

#### FR-011.2: Personal Statistics
- **Location:** User profile
- **Data:**
  - karma_points
  - posts_count
  - followers_count / following_count
  - total_donations_amount
  - total_volunteer_hours
  - Donations by category

#### FR-011.3: Activity Tracking
- **Table:** user_activities
- **Stored Data:**
  - activity_type (login, donation, chat, view_category, etc.)
  - activity_data (JSONB)
  - ip_address
  - user_agent
  - created_at
- **Uses:**
  - Analytics
  - Pattern identification
  - Security (suspicious activity detection)

#### FR-011.4: Statistics Components
- **CommunityStatsGrid** - Statistics cards grid
- **CommunityStatsPanel** - Panel with key numbers
- **DonationStatsScreen** - Donation statistics
- **DonationStatsFooter** - Footer with statistics on donations page
- **StatMiniCharts** - Miniature charts
- **StatDetailsModal** - Statistics details

#### FR-011.5: Redis Caching
- **Description:** Using Redis for statistics caching
- **Mechanism:**
  - Store common data (totalUsers, totalDonations, etc.)
  - TTL (Time To Live) - Automatic expiration
  - Cache clearing in appropriate cases (clearStatsCaches)
- **Benefits:**
  - Fast performance
  - Reduced load on PostgreSQL
  - Support for scalable system

---

### FR-012: Search and Filtering

#### FR-012.1: General Search
- **Screen:** `SearchScreen`
- **Options:**
  - Search users
  - Search posts
  - Search donations
  - Search rides
  - Search items
- **Component:** `SearchBar`

#### FR-012.2: Full-Text Search
- **Description:** Advanced text search
- **Technology:** PostgreSQL pg_trgm extension
- **Tables with FTS:**
  - items (title, description)
  - donations (title, description)
  - posts (title, description)
- **Indexes:**
  - GIN indexes on text fields
  - Trigram similarity

#### FR-012.3: Filtering and Sorting
- **Component:** `FilterSortOptions`
- **Filter Options:**
  - By category
  - By date
  - By location
  - By status
  - By tags
- **Sort Options:**
  - New → Old
  - Old → New
  - Popularity (likes)
  - Proximity (location-based)

#### FR-012.4: Location Search
- **Component:** `LocationSearchComp`
- **Description:** Search and select location
- **Integration:** Google Places API
- **Features:**
  - Autocomplete
  - GPS coordinates
  - Save recent locations

---

### FR-013: Following and Social Connections

#### FR-013.1: Following Users
- **Description:** Users can follow other users
- **Table:** user_follows
- **Fields:**
  - follower_id (who follows)
  - following_id (who is followed)
- **Constraints:**
  - UNIQUE(follower_id, following_id)
- **Actions:**
  - `followUser(userId)` - Start following
  - `unfollowUser(userId)` - Stop following
  - `getFollowers(userId)` - Followers list
  - `getFollowing(userId)` - Following list

#### FR-013.2: Counters
- **Fields in user_profiles:**
  - followers_count - Number of followers
  - following_count - Number following
- **Update:**
  - Automatic trigger on add/remove in user_follows

#### FR-013.3: Following Screens
- **Screen:** `FollowersScreen`
- **Modes:**
  - Followers
  - Following
- **Actions:**
  - View lists
  - Follow/unfollow
  - Navigate to profile

#### FR-013.4: Discover People
- **Screen:** `DiscoverPeopleScreen`
- **Description:** Recommendations for people to follow
- **Algorithm (basic):**
  - Active users
  - Users in same area
  - Users with similar interests

---

### FR-014: Organizations

#### FR-014.1: Organization Registration
- **Screen:** `OrgOnboardingScreen`
- **Fields:**
  - Organization name
  - Description
  - Organization type (NGO, Charity, Community, etc.)
  - Activity areas
  - Contact details (email, phone, address)
  - Logo
  - Registration number (if exists)
- **Process:**
  1. Fill form
  2. Submit request (organization_applications)
  3. Wait for admin approval
  4. Approval → Create organization + promote role to org_admin

#### FR-014.2: Organization Management
- **Screen:** `OrgDashboardScreen`
- **Access:** Only organization managers (org_admin)
- **Actions:**
  - Update organization details
  - Manage members
  - View donations to organization
  - Statistics

#### FR-014.3: Organizations Table
- **Table:** organizations
- **Main Fields:**
  - name, description
  - website_url, contact_email, contact_phone
  - address, city
  - organization_type
  - activity_areas (TEXT[])
  - is_verified - Verified by admins
  - status (active, inactive, pending)

#### FR-014.4: Organization Requests
- **Table:** organization_applications
- **Statuses:**
  - pending - Waiting
  - approved - Approved
  - rejected - Rejected
- **Admins:**
  - View requests (AdminOrgApprovalsScreen)
  - Approve/reject
  - Comments (reviewed_by, reviewed_at)

---

## Security Requirements

### SEC-001: Authentication & Authorization

#### SEC-001.1: User Authentication
- **Password Hashing:** Argon2 (memory-hard, resistant to GPU attacks)
- **JWT Tokens:**
  - Access Token: 15 minutes
  - Refresh Token: 7 days
  - HMAC-SHA256 signing
  - Secure storage (AsyncStorage/LocalStorage)
- **Google OAuth:**
  - Server-side token verification
  - Email verification required
  - Separate Google ID and Firebase UID

#### SEC-001.2: Rate Limiting
- **Mechanism:** NestJS Throttler
- **Limits:**
  - Login: 5 attempts/minute
  - Register: 5 attempts/minute
  - Google Auth: 10 attempts/minute
  - Token Refresh: 20 attempts/minute
  - Email Check: 10 attempts/minute
  - Global: 60 requests/minute per IP
- **Override:** Per-route `@Throttle()` decorator

#### SEC-001.3: Input Validation
- **Server-side:**
  - class-validator DTOs
  - Email normalization (lowercase, trim)
  - Length constraints
  - Type checking
- **Client-side:**
  - Form validation
  - Sanitization

#### SEC-001.4: Secure Logging
- **Principles:**
  - Don't log passwords/tokens
  - Log only partial emails (3 chars + domain)
  - Log only domains, not full emails
  - Stack traces only in development

### SEC-002: Data Protection

#### SEC-002.1: HTTPS Only
- **All Communication:** HTTPS (TLS 1.2+)
- **Certificate Pinning:** (future plan)

#### SEC-002.2: HTTP Security Headers
- **Helmet.js:**
  - Content Security Policy
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security

#### SEC-002.3: CORS
- **Settings:**
  - Allowed origins: production + dev domains
  - Credentials: true
  - Specific methods (GET, POST, PUT, DELETE)

#### SEC-002.4: SQL Injection Prevention
- **Parameterized Queries:** Always with `$1, $2...`
- **ORM/Query Builder:** pg library with prepared statements
- **No string concatenation of queries**

#### SEC-002.5: XSS Prevention
- **React Native:** Automatic escaping
- **Web:** Sanitization of user input
- **CSP Headers:** Prevent inline scripts

### SEC-003: Authorization & Access Control

#### SEC-003.1: Role-Based Access Control (RBAC)
- **Roles:** user, volunteer, admin, org_admin, super_admin
- **Hierarchy Levels:**
  - Level 0: user (no special permissions)
  - Level 1: volunteer (user with assigned manager)
  - Level 2: admin (can manage volunteers)
  - Level 3: org_admin (organization manager - parallel to admin)
  - Level 4: super_admin (full system access)
  
- **Guards:**
  - `JwtAuthGuard` - JWT verification
  - `RolesGuard` - Role-based permission check
  - `HierarchyGuard` - Hierarchical structure permission check
  
- **Enforcement:**
  - Server-side checks on every endpoint
  - Client-side UI hiding (not security)
  - Hierarchy validation on every manager-volunteer operation

#### SEC-003.2: Resource Ownership
- **Principle:** User can only edit their own content
- **Checks:**
  - Posts: author_id === current_user_id
  - Comments: user_id === current_user_id
  - Tasks: Only assignees and creator
  - Donations: Only donor

#### SEC-003.3: Protected Endpoints by Role
- **super_admin Only:**
  - `/api/admin/*` - All full management interfaces
  - `/api/users/:id/promote` - Promote to manager/super_admin
  - `/api/users/:id/demote` - Demote from role
  - `/api/stats/full` - Full statistics
  - `/api/hierarchy/tree` - Full hierarchy tree
  - `/api/managers/:managerId/volunteers/:volunteerId` - Unassign any
  
- **admin + super_admin:**
  - `/api/managers/invite-volunteer` - Invite volunteer
  - `/api/managers/my-volunteers` - My volunteers list
  - `/api/managers/:managerId/volunteers` - Volunteers list (admin sees only theirs)
  
- **volunteer + admin + super_admin:**
  - `/api/volunteers/my-manager` - My manager
  - `/api/volunteers/unassign` - Self-unassign
  
- **org_admin:**
  - `/api/organizations/:orgId/*` - Manage my organization
  - `/api/org-approvals/*` - Organization request approvals

#### SEC-003.4: Hierarchy Validation
- **Cycle Prevention:**
  - Every assignment performs BFS/DFS up the tree
  - If new user found in parent chain → REJECT
  - Time complexity: O(depth) - usually small
  
- **Single Manager Constraint:**
  - Check that volunteer not already assigned to another manager
  - If assigned → Require unassignment first
  
- **Permission Validation:**
  - admin can assign/unassign only **direct** volunteers
  - super_admin can assign/unassign any volunteer
  - Senior manager can unassign volunteer from junior manager **under them**

### SEC-004: Session Security

#### SEC-004.1: Token Expiration
- **Access Token:** 15 minutes
- **Refresh Token:** 7 days
- **Automatic Refresh:** Before expiration

#### SEC-004.2: Token Revocation
- **Redis Blacklist:** (future plan)
- **Logout:** Delete tokens from storage

#### SEC-004.3: Session Hijacking Prevention
- **User Agent Tracking:** (future plan)
- **IP Tracking:** user_activities table

### SEC-005: Additional Security Measures

#### SEC-005.1: Account Lockout
- **(Future plan)** Lock account after X failed login attempts

#### SEC-005.2: Two-Factor Authentication (2FA)
- **(Future plan)** Support TOTP/SMS

#### SEC-005.3: Email Verification
- **(Future plan)** Email verification before full system use

#### SEC-005.4: Password Requirements
- **(Future plan)**
  - Minimum 8 characters
  - Upper/lowercase letters
  - Numbers
  - Special characters

#### SEC-005.5: Security Auditing
- **(Future plan)** Detailed logs of security actions

---

## Performance Requirements

### PERF-001: Database Performance

#### PERF-001.1: Indexes
- **Description:** All fields used for search/sort are indexed
- **Types:**
  - B-tree indexes - for regular fields
  - GIN indexes - for arrays and JSONB
  - Trigram indexes - for full-text search
- **Examples:**
  - `idx_user_profiles_email_lower`
  - `idx_donations_type`
  - `idx_posts_created_at`
  - `idx_items_title_trgm`

#### PERF-001.2: Query Optimization
- **Pagination:** LIMIT + OFFSET
- **Selective Columns:** SELECT only required fields
- **Joins:** Instead of N+1 queries
- **Aggregations:** COUNT, SUM in database

#### PERF-001.3: Connection Pooling
- **pg Pool:** Efficient connection management
- **Max Connections:** Set according to load

### PERF-002: Redis Caching

#### PERF-002.1: Cache Strategy
- **Stored Data:**
  - Community stats (totalUsers, totalDonations, etc.)
  - User sessions
  - Rate limiting counters
- **TTL:**
  - Stats: 5-15 minutes
  - Sessions: According to token expiration
- **Invalidation:**
  - Manual clear (clearStatsCaches)
  - Auto-expiration (TTL)

#### PERF-002.2: ioredis
- **Client:** ioredis 5+
- **Features:**
  - Automatic reconnection
  - Cluster support (future)
  - Pipeline support

### PERF-003: API Response Time

#### PERF-003.1: Target Response Times
- **< 100ms:** Simple GET requests (cached)
- **< 500ms:** Complex queries (with DB)
- **< 1000ms:** File uploads (small files)
- **< 3000ms:** Large file uploads

#### PERF-003.2: Optimization Techniques
- **Lazy Loading:** Gradual data loading
- **Pagination:** LIMIT queries
- **Compression:** GZIP responses (via Helmet)
- **CDN:** (future) for static assets

### PERF-004: Client Performance

#### PERF-004.1: Rendering
- **React Native:**
  - FlatList for long lists (virtualization)
  - Memoization (React.memo, useMemo)
  - Avoid unnecessary re-renders
- **Images:**
  - Lazy loading
  - Image compression
  - Caching (expo-file-system)

#### PERF-004.2: Network
- **Batch Requests:** Merge similar requests
- **Debouncing:** Search, auto-save
- **Offline Support:** (future) caching with AsyncStorage

#### PERF-004.3: Bundle Size
- **Code Splitting:** (Web) dynamic imports
- **Tree Shaking:** Remove unused code
- **Minification:** Production builds

### PERF-005: Scalability

#### PERF-005.1: Horizontal Scaling
- **Stateless Backend:** Can add instances
- **Load Balancer:** Railway/Nginx
- **Session Store:** Redis (shared)

#### PERF-005.2: Database Scaling
- **Read Replicas:** (future) for read-heavy queries
- **Partitioning:** (future) for large tables
- **Sharding:** (future) if needed

---

## UI/UX Requirements

### UX-001: Responsive Design

#### UX-001.1: Platform Support
- **Mobile:** iOS (iPhone, iPad), Android (Phone, Tablet)
- **Web:** Desktop (1920x1080+), Laptop (1366x768+), Tablet (768x1024)
- **Adaptive Layouts:**
  - Single column (mobile)
  - Multi-column (tablet/desktop)
  - Grid views (1-3 columns)

#### UX-001.2: Responsive Components
- **Utilities:** `getScreenInfo()`, `isLandscape()`, `responsiveSpacing()`
- **Breakpoints:**
  - Mobile: < 768px
  - Tablet: 768-1024px
  - Desktop: > 1024px

### UX-002: RTL Support

#### UX-002.1: Languages
- **Hebrew (RTL):** Default
- **English (LTR):** Full support

#### UX-002.2: i18n
- **Library:** i18next + react-i18next
- **Files:** `locales/he/{namespace}.json`, `locales/en/{namespace}.json` (split by namespace: common, donations, auth, etc.)
- **Features:**
  - Dynamic language switching
  - Automatic RTL flip
  - Pluralization
  - Interpolation

#### UX-002.3: RTL Layout
- **I18nManager:** React Native RTL
- **Flexbox:** direction: row-reverse
- **Icons:** Mirror where needed

### UX-003: Accessibility

#### UX-003.1: Screen Readers
- **accessibilityLabel:** For all interactive elements
- **accessibilityHint:** Action explanation
- **accessibilityRole:** Element type

#### UX-003.2: Colors & Contrast
- **WCAG AA:** Contrast ratio >= 4.5:1
- **Color Blindness:** No reliance on color alone

#### UX-003.3: Font Sizes
- **Minimum:** 14px for body text
- **Scalable:** Support Dynamic Type (iOS)

### UX-004: Themes & Dark Mode

#### UX-004.1: Dark Mode
- **Support:** settings.dark_mode
- **Colors:** `globals/colors.tsx`
- **Switching:** Runtime

#### UX-004.2: Color Palette
- **Primary:** Blue/Green (Karma branding)
- **Secondary:** Yellow/Orange
- **Backgrounds:** White/Gray (light), Dark (dark)
- **Text:** Black/White (contrast)

### UX-005: Animations & Feedback

#### UX-005.1: Transitions
- **React Native Reanimated:** Smooth animations
- **Timing:** 200-300ms for UI transitions
- **Easing:** ease-in-out

#### UX-005.2: User Feedback
- **Loading States:**
  - Spinner/ActivityIndicator
  - Skeleton screens
  - Progress bars (file uploads)
- **Success/Error:**
  - Toast messages
  - Modal alerts
  - Inline validation

#### UX-005.3: Haptic Feedback
- **expo-haptics:**
  - Button press
  - Toggle switch
  - Long press

### UX-006: Navigation

#### UX-006.1: Bottom Tab Navigator
- **Tabs:** Home, Search, Donations, Profile, Admin (if admin)
- **Icons:** Material Icons, Ionicons
- **Badge:** Unread notifications, messages

#### UX-006.2: Top Bar
- **Elements:**
  - Settings
  - Notifications (with badge)
  - Chat
  - About
- **Dynamic Title:** According to current screen

#### UX-006.3: Deep Linking
- **linkingConfig:** URL routing
- **Universal Links:** (future) for app/web

#### UX-006.4: Back Navigation
- **Stack Navigation:** Back button
- **Gesture:** Swipe back (iOS)
- **Web:** Browser back

### UX-007: Error Handling

#### UX-007.1: Error Boundary
- **Component:** `ErrorBoundary`
- **Fallback UI:** Friendly error message + retry

#### UX-007.2: Network Errors
- **Retry:** Automatic retry (3 attempts)
- **Offline Mode:** (future) cached data
- **User Message:** "No internet connection"

#### UX-007.3: Validation Errors
- **Inline:** Red text below input
- **Toast:** For form submissions
- **Specific Messages:** "Email already exists", "Required field", etc.

### UX-008: Special UI Features

#### UX-008.1: Pull-to-Refresh
- **FlatList:** refreshControl prop
- **Usage:** Feed, lists

#### UX-008.2: Infinite Scroll
- **FlatList:** onEndReached
- **Pagination:** Load next page

#### UX-008.3: Swipe Actions
- **Usage:** Delete chat, delete notification
- **react-native-gesture-handler**

#### UX-008.4: Floating Bubbles
- **Components:**
  - `FloatingBubblesSkia` - Skia rendering
  - `FloatingBubblesOverlay` - Overlay layer
- **Usage:** Decorative animation

#### UX-008.5: Profile Completion Banner
- **Component:** `ProfileCompletionBanner`
- **Trigger:** Missing profile fields
- **Actions:** "Complete Profile"

#### UX-008.6: Guest Mode Notice
- **Component:** `GuestModeNotice`
- **Trigger:** User in guest mode
- **Actions:** "Register Now"

#### UX-008.7: Dev Environment Banner
- **Component:** `DevEnvironmentBanner`
- **Trigger:** DEV environment
- **Styling:** Distinct color (red/orange)

---

## External Integrations

### INT-001: Firebase

#### INT-001.1: Firebase Authentication
- **SDK:** Firebase JS SDK 10.12
- **Methods:**
  - Google Sign-In
  - Email/Password
  - Phone (future)
- **onAuthStateChanged:** Real-time sync

#### INT-001.2: Firebase Storage
- **Usage:** Upload images, files
- **Paths:**
  - `/users/{userId}/avatar.jpg`
  - `/chat/{conversationId}/{messageId}/{filename}`
  - `/posts/{postId}/{filename}`
- **Security Rules:** (Plan - secured by userId)

#### INT-001.3: Firestore (Optional)
- **Usage:** Real-time listeners (fallback if PostgreSQL unavailable)
- **Collections:** users, posts, chats, etc.
- **Sync:** Backend → Firestore (optional)

### INT-002: Google APIs

#### INT-002.1: Google OAuth 2.0
- **Library:** google-auth-library
- **Flow:**
  1. Client gets ID Token from Google
  2. Client sends to backend
  3. Backend verifies with `googleClient.verifyIdToken()`
  4. Backend creates/updates user
- **Scopes:** profile, email

#### INT-002.2: Google Places API
- **Usage:** Location search (PlacesController)
- **Endpoints:**
  - Autocomplete
  - Place Details
  - Geocoding
- **Component:** `LocationSearchComp`

### INT-003: Railway (Deployment)

#### INT-003.1: Backend Deployment
- **Platform:** Railway.app
- **Trigger:** Git push to main/dev
- **Build:**
  - `npm run build`
  - `npm start`
- **Environment Variables:** Injected by Railway

#### INT-003.2: PostgreSQL
- **Type:** Managed PostgreSQL instance
- **Connection:** DATABASE_URL

#### INT-003.3: Redis
- **Type:** Managed Redis instance
- **Connection:** REDIS_URL

### INT-004: Expo Services

#### INT-004.1: Expo Push Notifications
- **SDK:** expo-notifications
- **Flow:**
  1. Request permission
  2. Get Expo Push Token
  3. Store token in backend
  4. Send notifications from backend
- **Types:** badge, sound, alert

#### INT-004.2: Expo Updates
- **OTA Updates:** Over-the-air for JS code
- **Trigger:** Publish to Expo

#### INT-004.3: Expo Image Picker
- **SDK:** expo-image-picker
- **Usage:** Select images from gallery/camera

#### INT-004.4: Expo Document Picker
- **SDK:** expo-document-picker
- **Usage:** Select files (PDF, DOC, etc.)

#### INT-004.5: Expo Location
- **SDK:** expo-location
- **Usage:** Get current location (GPS)

### INT-005: GitHub Actions (CI/CD)

#### INT-005.1: Automated Testing
- **(Plan)** Run tests on PR
- **(Plan)** Lint check

#### INT-005.2: Deployment
- **(Plan)** Auto-deploy to Railway on merge to main/dev

---

## Summary

This document describes all functional, security, performance, and UI/UX requirements of the **Karma Community** system.

### Main Modules:
1. User Management and Authentication
2. Donations and Gifts (33 categories)
3. Physical Items for Donation
4. Carpooling/Rides
5. Tasks and Project Management
6. Challenges (Personal and Community)
7. Posts and Social Feed
8. Chat and Messaging (text, image, file, voice, location)
9. Notifications
10. Admin Management (Admin Dashboard)
11. Statistics and Analytics
12. Following and Social Connections
13. Organizations

### Technologies:
- **Backend:** NestJS, PostgreSQL, Redis, Firebase Admin
- **Frontend:** React Native (Expo), Zustand, Axios, i18next
- **Cloud:** Railway, Firebase Storage
- **Security:** JWT, Argon2, Rate Limiting, Input Validation

### Notes:
- ✅ = Implemented
- (Future plan) = Planned but not yet implemented

---

**End of System Requirements Document**
