# 🔐 Google Authentication Testing & Debugging Guide

This guide explains how to test, debug, and troubleshoot Google Authentication in your app.

## 🚀 Quick Test

Run the automated authentication test script:

```bash
cd MVP
node scripts/testAuth.js
```

This will check:
- ✅ Configuration files
- ✅ Environment variables
- ✅ OAuth redirect routes
- ✅ Network connectivity
- ✅ Component setup

## 🔍 Detailed Logging & Diagnostics

### Development Mode Diagnostics

When running in development mode, the app automatically runs comprehensive diagnostics and logs detailed information to help you debug authentication issues.

**To view logs:**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for logs starting with `🔐 Authentication Test Results`

### Manual Diagnostics

You can run diagnostics manually in your browser console:

```javascript
// Run this in browser console when on your app
window.__runAuthDiagnostics && window.__runAuthDiagnostics();
```

## 📋 Common Issues & Solutions

### Issue 1: `redirect_uri_mismatch` Error

**Problem:** Google shows error about redirect URI mismatch

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth client ID: `430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com`
3. Add this URI to "Authorized redirect URIs":
   ```
   https://karma-community-kc.com/oauthredirect
   ```
4. Save changes and wait 5 minutes for propagation

### Issue 2: Client ID Configuration Missing

**Problem:** Button shows as disabled or "Google login unavailable"

**Check:** Run `node scripts/testAuth.js` to verify configuration

**Solution:** Ensure these values are set in `app.config.js`:
```javascript
extra: {
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com",
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "430191522654-q05j71a8lu3e1vgf75c2r2jscgckb4mm.apps.googleusercontent.com",
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: "430191522654-jno2tkl1dotil0mkf4h4hahfk4e4gas8.apps.googleusercontent.com"
}
```

### Issue 3: OAuth Redirect Route Missing

**Problem:** Authentication completes but user is stuck on Google page

**Solution:** Ensure `app/oauthredirect.tsx` exists and contains:
```typescript
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();
```

### Issue 4: Network/Firewall Issues

**Problem:** Authentication fails with network errors

**Test:** Run network diagnostic:
```bash
curl -I https://accounts.google.com
curl -I https://oauth2.googleapis.com/tokeninfo
```

**Solution:** Check firewall, proxy, or network restrictions

### Issue 5: JWT Token Parsing Errors

**Problem:** User gets "Failed to parse user data" error

**Debug:** Check browser console for JWT parsing logs

**Solution:** Usually indicates corrupted token or network issue during OAuth flow

## 🛠️ Advanced Debugging

### Enable Verbose Logging

Add this to your app component to enable maximum logging:

```typescript
import { logger } from '../utils/loggerService';

// Set log level to debug
logger.setLevel('debug');
```

### Manual Authentication Flow Test

Test each step manually:

1. **Configuration Check:**
   ```javascript
   console.log('Client IDs:', {
     web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
     ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
     android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
   });
   ```

2. **Redirect URI Check:**
   ```javascript
   console.log('Redirect URI:', `${window.location.origin}/oauthredirect`);
   ```

3. **Network Connectivity:**
   ```javascript
   fetch('https://accounts.google.com/.well-known/openid_configuration')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error);
   ```

### Component State Debugging

The `SimpleGoogleLoginButton` component now shows its current state:
- `מתכונן...` - Configuring OAuth
- `התחבר/הרשם עם גוגל` - Ready
- `מתחבר...` - Authentication in progress
- `התחבר בהצלחה!` - Success
- `נסה שוב` - Error state

## 📊 Test Results Interpretation

### Test Script Output

- ✅ **Green checkmarks**: Everything working correctly
- ⚠️ **Yellow warnings**: Potential issues that might cause problems
- ❌ **Red X marks**: Critical issues that will prevent authentication

### Browser Console Logs

Look for these log patterns:

**Successful Flow:**
```
🔍 Web redirect URI: https://karma-community-kc.com/oauthredirect
🔑 OAuth tokens received: hasIdToken=true
✅ User profile parsed successfully
🔐 Authentication flow completed successfully
```

**Failed Flow:**
```
❌ OAuth response not successful: type=error
❌ No ID token received from Google OAuth response
❌ Network connectivity test failed
```

## 🔧 Quick Fixes

### Reset Authentication State
```bash
# Clear any stuck OAuth state
localStorage.removeItem('oauth_in_progress');
```

### Force Configuration Reload
```bash
# Restart your development server
npm start --reset-cache
```

### Test Specific Platform
```bash
# Web
npm run web

# iOS simulator
npm run ios

# Android emulator  
npm run android
```

## 📞 Getting Help

If authentication still isn't working after following this guide:

1. **Run the test script** and share the output:
   ```bash
   node scripts/testAuth.js > auth-test-results.txt
   ```

2. **Check browser console** for error messages

3. **Verify Google Cloud Console settings** match the configuration exactly

4. **Share logs** from the development console showing the authentication flow

Remember: Authentication issues are almost always configuration problems, not code problems. Double-check your Google Cloud Console settings and redirect URIs!
