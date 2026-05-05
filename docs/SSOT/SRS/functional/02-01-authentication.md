> **SRS shard:** `SRS/functional/02-01-authentication.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.1 Authentication Module (`modules/auth`)

#### 2.1.1 Email Registration

- **Description:** Register a new user with email and password
- **Endpoint:** `POST /auth/register` and `POST /api/users/register`
- **Inputs:** email, password, name, optional profile fields
- **Outputs:** `ApiResponse` with user data and JWT token pair (`accessToken`, `refreshToken`, `expiresIn`, `refreshExpiresIn`)
- **Business logic:**
  - Password hashed with `argon2`
  - JWT token pair created (HMAC-SHA256, access 1h, refresh 30d)
  - Refresh token stored in Redis with TTL
  - User profile created in `user_profiles` table
  - `ROOT_ADMIN_EMAIL` auto-promoted to `super_admin` on first login
- **Edge cases:**
  - Duplicate email returns error
  - `JWT_SECRET` must be ≥ 32 characters or the server refuses to start

#### 2.1.2 Email Login

- **Description:** Authenticate existing user with email/password
- **Endpoint:** `POST /auth/login` and `POST /api/users/login`
- **Inputs:** email, password
- **Outputs:** JWT token pair + user data
- **Business logic:**
  - Credential verification via `argon2.verify`
  - New session created with unique `sessionId`
  - Rate-limited via `ThrottlerGuard` (60 req/60s on auth controller)

#### 2.1.3 Google OAuth

- **Description:** Authenticate via Google Sign-In
- **Endpoint:** `POST /auth/google`
- **Inputs:** Google ID token
- **Outputs:** JWT token pair + user data
- **Business logic:**
  - Token verified via `google-auth-library`
  - User matched/created by `google_id` or `email`
  - Firebase UID linked if available

#### 2.1.4 Sign in with Apple (iOS)

- **Description:** Authenticate via Sign in with Apple on the **iOS** client when Google SSO is offered — **required for App Store compliance** (Guideline 4.8).
- **Platform:** iOS app build only; Android and Web do not surface this provider in MVP.
- **Inputs:** Apple identity token (and authorization code if used by the backend exchange flow).
- **Outputs:** JWT token pair + user data (same session model as other auth methods).
- **Business logic:**
  - Verify Apple-issued JWT (JWKS: `https://appleid.apple.com/auth/keys`).
  - User matched/created by Apple `sub` (stable subject identifier); handle **Hide My Email** relay addresses per Apple rules.
  - Account unlinking / provider pairing deferred (same as Google — see MVP “no account linking”).

#### 2.1.5 Token Refresh

- **Description:** Refresh expired access token using refresh token
- **Endpoint:** `POST /auth/refresh`
- **Inputs:** refresh token
- **Outputs:** New access token + expiry
- **Business logic:**
  - Verify refresh token signature + Redis existence
  - Fetch **latest roles from database** (ensures role changes propagate)
  - Issue a new access token with the same session ID

#### 2.1.6 Email Availability Check

- **Description:** Check if email is already registered
- **Endpoint:** `GET /auth/check-email`
- **Inputs:** email (query parameter)
- **Outputs:** Boolean availability

#### 2.1.7 User ID Resolution

- **Description:** Resolve user identity from Firebase UID, Google ID, Apple subject (`sub`), or email
- **Endpoint:** `POST /api/users/resolve-id`
- **Inputs:** `firebase_uid`, `google_id`, `apple_sub`, `email`
- **Outputs:** Resolved user profile + JWT tokens
- **Business logic:** Tries matching by `firebase_uid` → `google_id` → `apple_sub` → `email`; creates user if none found

#### 2.1.8 Session Management

- **Description:** Redis-based session management
- **Endpoints:**
  - `POST /session/login` — create session
  - `GET /session/validate/:sessionId` — validate session
  - `GET /session/user/:userId` — list user sessions
  - `DELETE /session/logout/:sessionId` — single session logout
  - `DELETE /session/logout-all/:userId` — logout all sessions
  - `GET /session/stats` — session statistics
  - `GET /session/protected` — test protected endpoint
- **Business logic:** Sessions stored in Redis with prefix `session:`, TTL 24 hours

#### 2.1.9 Token Revocation

- **Description:** Blacklist tokens upon logout
- **Business logic:**
  - Blacklisted tokens stored in Redis with key `blacklisted_token:{hash}` and remaining TTL
  - Token hash computed via SHA-256
  - Refresh token removed from Redis storage