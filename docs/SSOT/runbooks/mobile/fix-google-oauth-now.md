# 🔧 Immediate fix: redirect_uri_mismatch error

## The problem
Google OAuth returns an error: `Error 400: redirect_uri_mismatch`

This happens because the redirect URI that the application sends to Google does not match the URI configured in the Google Cloud Console.

## Quick solution (5 minutes)

### Step 1: Identify the current Redirect URI

1. Open the app in the browser
2. Press F12 to open the Console
3. Look for messages with "Google OAuth Redirect URI" or "Redirect URI configured"
4. Copy the exact URI that appears there

**OR** - Open the Console and search for:
```
🔐 Google OAuth Redirect URI: [address here]
```

### Step 2: Adding the URI to the Google Cloud Console

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your project (if there are several)
3. Click on your **OAuth 2.0 Client ID** (type "Web client")
4. Scroll down to **Authorized redirect URIs**
5. Click **+ ADD URI**
6. Paste the URI you copied in step 1 (must be exactly the same!)
7. Click **Save** at the bottom of the page
8. **Wait 1-2 minutes** for the changes to take effect

### Step 3: Testing

1. Refresh the page in the Google Cloud Console
2. Verify that the URI appeared in the list
3. Try connecting with Google again

## List of common URIs that need to be added

### for Development (Localhost):
```
http://localhost:8081/oauthredirect
http://localhost:19006/oauthredirect
http://127.0.0.1:8081/oauthredirect
http://127.0.0.1:19006/oauthredirect
```

### for Production:
```
https://karma-community-kc.com/oauthredirect
https://www.karma-community-kc.com/oauthredirect
```

### For Mobile (iOS/Android):
```
com.navesarussi1.KarmaCommunity://oauthredirect
```

## ⚠️ Very important

1. **URI must be exactly the same** - including:
   - protocol (http/https)
   - Domain name (localhost/127.0.0.1/karma-community-kc.com)
   - port (8081/19006)
   - path (/oauthredirect)

2. **No spaces** - Make sure there are no spaces before or after the URI

3. **Case sensitive** - the URI is case sensitive

4. **Update time** - sometimes it takes 1-2 minutes for the changes to take effect

## How to identify what the current URI is?

### Way 1: Console of the browser
1. Press F12
2. Go to the Console tab
3. Search for: `Google OAuth Redirect URI` or `redirectUri`

### Way 2: Network Tab
1. Press F12
2. Go to the Network tab
3. Try connecting with Google
4. Look for a request to `accounts.google.com`
5. Check the `redirect_uri` parameter in the URL

### Way 3: Code
Open the console and write:
```javascript
console.log('Current origin:', window.location.origin);
console.log('Redirect URI:', window.location.origin + '/oauthredirect');
```

## if still not working

1. **make sure the URI is exactly the same** - copy-paste from the console
2. **Wait 2-3 minutes** - Google takes time to update
3. **Clear Cache** - Ctrl+Shift+Delete and try again
4. **Check Client ID** - Make sure you are using the correct Web Client ID

## Your Client IDs

According to your code, the Client IDs are:
- **Web**: `430191522654-o70t2qnqc4bvpvmbpak7unog7pvp9c95.apps.googleusercontent.com`
- **iOS**: `430191522654-q05j71a8lu3e1vgf75c2r2jscgckb4mm.apps.googleusercontent.com`
- **Android**: `430191522654-jno2tkl1dotil0mkf4h4hahfk4e4gas8.apps.googleusercontent.com`

**IMPORTANT**: Add the redirect URIs to the **Web Client ID** (first in the list).