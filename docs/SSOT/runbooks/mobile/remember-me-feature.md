# Documentation: "Remember Me" feature - Remember Me Feature

## Overview

The authentication system has been updated to remember the user automatically without the need to log in again every time the application is opened.

## How does it work?

### 🔥 Firebase Auth Persistence

1. **Login with Email/Password**:
   - Firebase Auth automatically saves the session in AsyncStorage (React Native) or LocalStorage (Web)
   - The user remains connected until he explicitly disconnects
   - No need to save a password - Firebase manages secure tokens

2. **Login with Google**:
   - Google OAuth feeds the credentials to Firebase Auth
   - Firebase saves the session automatically
   - The user remains connected between sessions of the application

### 🎯 What is different in the code?

#### 1. UserContext.tsx
- **Added Firebase Auth Listener** (`onAuthStateChanged`):
  - Listener for changes in the Firebase login state
  - Automatically restores the user when the application is opened
  - Synchronizes UserContext with Firebase Auth
  
```typescript
// lines 95-178
useEffect(() => {
  const auth = getAuth(app);
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Restores session automatically
      // Creates userData and saves in AsyncStorage
      // Updates the context
    } else {
      // Clears session only if there was a Firebase user
    }
  });
  return () => unsubscribe();
}, []);
```

- **signOut update**:
  - disconnects from Firebase Auth (line 391)
  - Clears all AsyncStorage
  - Updates the context

#### 2. authService.ts
- **Adding Auth Persistence**:
  - Web: `browserLocalPersistence` (localStorage)
  - React Native: AsyncStorage (default)
  
```typescript
// lines 43-51
if (Platform.OS === 'web') {
  setPersistence(authInstance, browserLocalPersistence);
} else {
  // React Native uses AsyncStorage by default
}
```

#### 3. SimpleGoogleLoginButton.tsx
- **Integration with Firebase Auth**:
  - Google OAuth now feeds the credentials to Firebase Auth
  - Firebase Auth Listener captures the login and saves it
  - Enables automatic session persistence
  
```typescript
// lines 357-411
const credential = GoogleAuthProvider.credential(idToken);
await signInWithCredential(auth, credential);
// Firebase Auth listener will handle the rest automatically
```

## What does the user need to know?

### ✅ New behavior

1. **After successful login**:
   - The user remains connected even after closing the application
   - Reopening the application → go directly to the home screen
   - There is no need to enter email and password again

2. **disengaging**:
   - Click the logout button on the profile screen
   - This will clear the entire session
   - Next time will have to reconnect

3. **Security**:
   - The password is **not saved** on the device
   - Only secure Firebase tokens are saved
   - The time the user stays connected depends on Firebase Auth (usually 30 days)

## Tests that need to be done

### Test scenarios:

1. **Login with Email/Password**:
   - [ ] Log in with email and password
   - [ ] Close the application completely
   - [ ] Open the app again
   - [ ] **Expectation**: The user is already logged in, direct transition to the home screen

2. **Login with Google**:
   - [ ] Sign in with a Google account
   - [ ] Close the application
   - [ ] Reopen
   - [ ] **Expectation**: The user is already logged in

3. **disengaging**:
   - [ ] Press the logout button
   - [ ] **Expectation**: Transition to the Login screen
   - [ ] Close and open the application
   - [ ] **Waiting**: Login screen appears (not connected)

4. **Switch between devices**:
   - [ ] Connect on one device
   - [ ] Sign out on another device (via Firebase Console)
   - [ ] **Expectation**: On the first device it will disconnect automatically

## Future changes are possible

### Unrealized options (yet):

1. **Biometric Authentication**:
   - Adding Face ID / Touch ID / Fingerprint
   - Add another layer of security

2. **"Remember me for X days"**:
   - Possibility to choose a custom duration
   - Default: 30 days (Firebase)

3. **Notification about expired session**:
   - Displaying a message when the token expires
   - Offer to reconnect

## Updated files

1. `/MVP/context/UserContext.tsx` - Added Firebase Auth listener
2. `/MVP/utils/authService.ts` - persistence definition
3. `/MVP/components/SimpleGoogleLoginButton.tsx` - integration with Firebase Auth
4. `/MVP/docs/REMEMBER_ME_FEATURE.md` - this documentation

## Frequently asked questions

**Q: How long does the user stay logged in?**  
A: Firebase defaults to 30 days. After that the user will have to log in again.

**Q: What happens if someone steals my phone?**  
A: You can log out remotely through the Firebase Console or add biometric authentication in the future.