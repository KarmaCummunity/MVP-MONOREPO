# Packages (shared monorepo)

חבילות משותפות לפרויקט KC – מנוצלות על ידי `apps/api` ו-`apps/mobile`. מפחיתות כפילות ומרכזות חוזה משותף.

## חבילות

| Package | תיאור |
|--------|--------|
| **@kc/config-eslint** | קונפיגורציית ESLint משותפת (Node/TypeScript). ה-API מרחיב ממנה ב-`.eslintrc.json`. |
| **@kc/shared-types** | טיפוסי TypeScript לחוזה ה-API – תגובות, pagination, auth, type guards. מקור יחיד ל-API ו-mobile. |

## @kc/shared-types – מה יש בפנים

- **Auth**: `AuthTokens` (כולל שדות אופציונליים `refreshExpiresIn`, `sessionId`, `tokenType`, `issuedAt`)
- **Response**: `ApiResponse<T>`, `BaseApiResponse<T>`, `ApiErrorResponse`, `ResponseMetadata`
- **Pagination**: `PaginationMeta`, `PaginatedResponse<T>`, `PaginatedApiResponse<T>`
- **Type guards**: `isSuccessResponse()`, `isErrorResponse()`, `isPaginatedApiResponse()`

ב-**mobile**: `apiService`, `SecureApiService`, `GoogleAuthService` ו-`google_auth/types/ApiTypes.ts`, `AuthTypes.ts` משתמשים ב-`@kc/shared-types` במקום הגדרות מקומיות כפולות.

## שימוש

- **API**: תלויה ב-`@kc/shared-types`; ESLint מרחיב מ-`packages/config-eslint`.
- **Mobile**: תלויה ב-`@kc/shared-types`; `apiService` ו-google_auth מייבאים משם; ב-`ApiTypes`/`AuthTypes` יש re-export ורק טיפוסים דומייניים (למשל `UserProfileResponse`, `AuthenticationResponse`).

## Build

מהרוט: `npm run build` בונה את כל ה-workspaces (כולל `packages/shared-types`).  
רק shared-types: `npm run build -w @kc/shared-types`.
