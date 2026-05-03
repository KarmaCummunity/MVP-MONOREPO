# Deployment for Railway (Backend + Frontend + Postgres + Redis)

A short guide to deploying the system to Railway as two separate services: `backend' (NestJS) and `web' (Expo Web on Nginx), with Postgres and Redis plugins.

## Prerequisites
- Railway account
- Install Railway CLI locally (optional): `npm i -g @railway/cli`
- Linking the repository to GitHub is recommended for automatic deployments

## Architecture overview
- Backend: folder `KC-MVP-server` (NestJS).
- Frontend Web: folder `MVP` (Expo export + Nginx).
- Databases: Railway Plugins for Postgres and Redis.

## Railway services
### 1) Creating a project and adding plugins
- Create a new Project in Railway.
- Add plugins (Plugins): Postgres, Redis.

### 2) Backend service (NestJS)
- Create a new Service from the `KC-MVP-server' folder (via GitHub or CLI):
  - CLI (optional):
    ```bash
    cd KC-MVP-server
    railway up --service backend
    ```
- Important environment variables (Railway determines some of them automatically):
  - Database:
    - Recommended: `DATABASE_URL` (created automatically by the Postgres plugin)
    - or: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE=require`
  - Redis:
    - `REDIS_URL` (if available), or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
    - If it's Upstash: `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_USERNAME`, `UPSTASH_REDIS_PASSWORD` are also supported
    - force TLS: `REDIS_TLS=true` (if required)
  - CORS:
    - `CORS_ORIGIN` = the front domain (e.g. `https://<web-subdomain>.up.railway.app`)
  - Google Places (optional):
    - `GOOGLE_API_KEY`

> The server listens to ``PORT`' of Railway automatically (`0.0.0.0`).

### 3) Web service (Nginx + Expo export)
- Create a new Service from the `MVP` folder (via GitHub or CLI):
  - CLI (optional):
    ```bash
    CD MVP
    railway up --service web
    ```
- Environment variables for the web service:
  - `BACKEND_BASE_URL` = public address of the backend, for example:
    - `https://<backend-subdomain>.up.railway.app`
  - (at build time) the default is already set so that the application will call `/api` as a relative path, and Nginx will proxy to `BACKEND_BASE_URL`.

## Quick tests
- Visit the URL of the web service. Make sure that actions that create calls to `/api/...` can be performed.
- Check Redis health: `https://<backend>/health/redis`.
- Check general health: `https://<backend>/`.

## Technical notes relevant to the code
- Backend:
  - The Postgres module supports ``DATABASE_URL'' and the standard PG* set.
  - The Redis module supports `REDIS_URL`/`REDIS_*` and also Upstash variables, with `REDIS_TLS`.
- Web:
  - Nginx uses a configuration template with `envsubst` to inject `BACKEND_BASE_URL` at runtime.
  - JS files make calls to `/api` by default; The proxy routes to the backend.

## Tips
- If you want a custom domain for the front/backend, add Custom Domain to each service and set `CORS_ORIGIN` accordingly.
- Logs: The Railway board shows the service logs.

## ⚠️ Important: Data Persistence

**Common problem:** The statistics data (such as the number of visits to the website) are reset every time the server is updated.

**Reason:** The server is not connected to Railway's Postgres Plugin, or it is using a temporary database.

### How to make sure the data save works:

1. **Make sure you have Postgres Plugin:**
   - In the Railway project, click "+ New" → "Database" → "Add PostgreSQL"
   - Railway will create a permanent database with a volume that is saved between updates

2. **Connect the backend to the plugin:**
   - On the Service page of the backend, click on "Variables"
   - In the "Plugins" section, make sure there is a connection to PostgreSQL
   - If not, click "Connect" and select the PostgreSQL Plugin

3. **Check the environment variables:**
   - `DATABASE_URL` should be set automatically by the plugin
   - or: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
   - If not - add them manually from the details of the PostgreSQL Plugin

4. **Inspection:**
   - Visit the site several times
   - update the server (push new code)
   - Visit the site again - the number of visits **should not reset**

### Technical notes:

- The code uses ``ON CONFLICT DO NOTHING'' to save existing data
- The logs will show " ✅ Preserved existing stat" when data is saved
- For more details see: `RAILWAY_DATA_PERSISTENCE.md`

### Common problems:

**The data is still being reset?**
- Check that the PostgreSQL is a Plugin and not a separate service
- Check that the connection is made through "Connect to Plugin" and not manually
- Check the logs - Look for database connection errors

**"relation does not exist"?**
- This means that the tables have not been created
- This should happen automatically on first startup
- If not - check the server logs