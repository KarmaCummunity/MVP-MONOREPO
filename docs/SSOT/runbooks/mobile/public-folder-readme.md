# ⚠️ This file is not in use!

The `public/index.html` file is an old file that displays a "coming soon" page and is **not used** by the application.

The app uses `web/index.html` instead.

If you see the "coming soon" page instead of the app, that means the server is serving that file instead of the React Native app.

**Solution:**
1. Make sure you run the application with `expo start --web` or `npm run web`
2. If you are using Docker, make sure you are using `Dockerfile` and not `Dockerfile.static`
3. If you want to delete this file, you can delete the whole `public/` folder