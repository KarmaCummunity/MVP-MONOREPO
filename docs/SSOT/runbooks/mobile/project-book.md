## Project Book – MVP

This document describes the structure of the project, the responsibility of each file and main dependencies.
The goal is to allow any new developer to quickly understand the architecture and workflow.

---

## 1. Overview of the project

- **Project name**: KC MVP (React Native/Expo app)
- **The purpose of the system**: Mobile and web application for managing and donating resources/funds/community content.
- **main technologies**:
  - React Native + Expo
  - TypeScript/JavaScript
  - Expo Router / adapted navigation system
  - Google OAuth integration

In the following chapters we will go through folder by folder and file by file, and describe their role.
We will also add comments on possible improvements and todo where relevant.

---

## 2. Root files

In this chapter, the main files found at the root of the project are documented.

- **`package.json`**  
  - **role**: Defines the project's Node package - application name, code version, entry point (`main'), dependencies (`dependencies'/`devDependencies') and scripts to run and build.  
  - **important scripts**:
    - `start` – standard run of the application with `expo start`.
    - `start:local` – run against a local API server (`http://localhost:3001`) using the backend instead of Firestore.
    - `android` / `ios` – build and run on an emulator/device.
    - `web`, `build:web`, `build:web:local` - run and export to the web version, including setting `EXPO_PUBLIC_API_BASE_URL` to production/local.  
  - **central dependencies**:  
    - Expo/React Native libraries (like `expo`, `react-native`, `expo-router`, `react-navigation`).  
    - UI and functionality libraries like `@expo/vector-icons`, `react-native-reanimated`, `react-native-gesture-handler`.  
    - International libraries (`i18next`, `react-i18next`), Firebase, and a physics engine (`matter-js`) for animations/simulations.  
  - **Todos exist in the file**:  
    - Completing an audit for dependencies, adding scripts for tests, lint, type-check, format and security audit, and ensuring orderly Semantic Versioning.

- **`app.config.js`**  
  - **role**: Expo dynamic configuration file in JavaScript, with the possibility to use `process.env` (eg `EXPO_PUBLIC_API_BASE_URL`).  
  - **main content**:
    - Defining `expo.name`, `slug`, `version`, icon, `scheme` and `userInterfaceStyle`.  
    - `ios` and `android` configuration (including bundle/package identifiers).  
    - `web` configuration - including `bundler`, meta data, RTL (`dir: "rtl"`) and design settings (background colors/Theme).  
    - Defining `plugins` (for example `expo-router`) and `experiments.typedRoutes`.  
    - `extra' block - contains all the public environment variables (API base URL, Google OAuth IDs, Firebase settings for each environment, and `eas.projectId').  
  - **Notes**:
    - This is the more recent configuration file; Some of the information overlaps with `app.json`.  
    - It is recommended later to merge/clean up duplicates between `app.config.js` and `app.json` according to what is actually in use.

- **`app.json`**  
  - **role**: Expo configuration file in JSON format (legacy / static), which defines a large part of the application's settings similar to `app.config.js`.  
  - **main content**:
    - `expo.name`, `slug`, `version`, icon, splash, main color, screen orientation, etc.  
    - iOS settings including permissions and ``infoPlist'' for Camera/Microphone/Photo Library.  
    - Android settings including specific permissions (notifications, Wake Lock, Foreground Service, etc.).  
    - Web configuration (favicon, themeColor, backgroundColor, viewport meta).  
    - `plugins` - mainly `expo-notifications` with icon and color settings for notifications.  
    - `extra` block - again defines environment variables for API, Google, Firebase and EAS (duplicates against `app.config.js`).  
  - **Notes**:
    - The file is still used by Expo, but some of the information may actually be managed through `app.config.js`.  
    - In the future, you should decide on one source of truth (dynamic config JS or static JSON) and remove duplicates.`) includes navigation from push notification responses (to the `ChatDetailScreen` / `NotificationsScreen` screens).  
    - Web Mode support: `WebModeToggleOverlay' component and additional padding in `app' mode on Web.  
  - **External Services**:
    - Using `expo-notifications` (using `notificationService`), `expo-web-browser` for OAuth, logging through `loggerService`.  
  - **Todos exist in the file**:
    - Improving error handling (fonts, notifications, deep linking), issuing a notification code to a dedicated hook/service, improving accessibility and issuing Magic Numbers to ``constants''.

- **`App.js`**  
  - **Role**: A basic App file created by Expo (default template). Displays a dummy screen with the text "Open up App.js to start working on your app!".  
  - **current situation**:
    - The actual application uses `App.tsx` as the main entry point (TypeScript).  
    - `App.js` remains as a historical/unused file, and can create confusion for new developers.  
  - **recommendation**:
    - Consider deleting/reducing the use of this file or add an explicit note that it is not in use, to avoid duplication between `App.js` and `App.tsx`.

- **`README.md`**  
  - **Role**: The project's main documentation document on GitHub - gives a marketing-technical overview, project goals, folder structure, installation and running process, permission levels, and future features.  
  - **main content**:
    - Project description: A free community application in Israel, connecting associations, donors and volunteers.  
    - List of **15 different character types** (donors, volunteers, families, associations, etc.).  
    - Explanation of the front-end architecture, the authentication and navigation mechanism (UserContext, LoginFlow, BottomNavigator).  
    - Installation instructions (`npm install`, `npm start`) and running on Android/iOS/Web.  
    - Detail on design (color palette, RTL, responsiveness), local storage, performance and basic security.  
  - **link to the project book**:
    - `PROJECT_BOOK.md` goes deeper at the file/code level, while `README.md` gives an external overlay.  
    - It is recommended to update both documents together when changing architecture or adding significant capabilities.

---

## 3. `app/` folder – Expo Router screens

The `app/` folder contains files related to Expo Router (even if some of them are now Legacy) as well as a dedicated screen for OAuth on the Web.

- **`app/_layout.tsx`**  
  - **Role**: Main Layout component for Expo Router, in **Legacy/Deprecated** mode. In practice it returns `null' and is used as a placeholder only.  
  - **Note**: According to the note in the file, the actual navigation is done through another navigation system (`MainNavigator` in `App.tsx`), and the file remains to prevent import errors from the library.

- **`app/(tabs)/_layout.tsx`**  
  - **role**: Layout component for Expo Router tabs, also in **Legacy/Deprecated** mode, returns `null`.  
  - **note**: similar to the main `_layout.tsx` - saved to prevent errors during runtime, but no longer manages the actual tabs.

- **`app/(tabs)/index.tsx`**  
  - **Function**: A simple static home screen (Welcome screen) designed for use with Expo Router, with the text "Welcome to KC_ID!" and a brief description of the platform.  
  - **current situation**:
    - The actual application is loaded through `index.js` → `App.tsx` and the classic navigation system (`MainNavigator`), not through Expo Router.  
    - The actual home screen the user sees is `bottomBarScreens/HomeScreen.tsx`.  
    - Therefore this file is currently used as a **Demo/Legacy** file only, and is not part of the main user flow.  
  - **UX Note**:
    - If in the future we want to build an official landing page for the Web using Expo Router - this file can be used as a basis and strengthen the design and microcopy.✅ / ❌), message title and help text.  
    - There is no quick cancellation/back option - the user waits until the end of the process and the redirect.  
  - **Questions for UX**:
    - Would you like to add a **manual return button** here (in case the process gets stuck), or a "return to the application" link that is always available?  
    - Would we like to show **stronger branding** (KC logo, short explanatory text) so that the user understands that he has returned to the application and not to a foreign page?

---

## 4. Logic and components folders

- **`components/`**: Repeated UI components for use on different screens.
- **`screens/`**: core screens of the application.
- **`donationScreens/`**: specific screens for different donation categories.
- **`bottomBarScreens/`, `topBarScreens/`**: screens connected to bottom/top tab navigators.
- **`context/`**: Context API for managing global state (user, loading state, Web state, etc.).
- **`utils/`**: auxiliary functions, API/DB services and additional infrastructure.
- **`globals/`**: color definitions, general styles, types and constants.
- **`google_auth/`**: centralized integration layer against Google OAuth and secure API services.

> In each of these folders we will go file by file and add a description, signature of main functions, and dependencies.

---

## 5. Native infrastructure (Android / iOS) and Web

- **`android/`** and **`ios/`**: native project definitions created by Expo/EAS - packages, permissions, build configurations.
- **`web/`** + `webpack.config.js`, `metro.config.js` files: build and bundling configurations for Web and React Native.

> TODO: expand on the difference between build and mobile and web and how deployment is carried out (according to `DEPLOYMENT.md`).

---

## 6. Existing documentation files

- **`README.md`**: general description of the project and operating instructions.
- **`DEPLOYMENT.md`**, **`AUDIT_REPORT.md`**, **`AUTHENTICATION_TEST.md`**, **`auth-testing.md`** (under `docs/SSOT/runbooks/mobile/`): existing documentation and tests.

> TODO: Summarize here the main points of the documents so that they are accessible at a glance in the project book.

---

## 7. Todo list for the project book

- [ ] Fill in detailed documentation for all root files.
- [ ] record each file in the `app/` folder.
- [ ] record each file in the `components/` folder.
- [ ] Document each screen in `screens/`, `donationScreens/`, `bottomBarScreens/`, `topBarScreens/` folders.
- [ ] Document all auxiliary services in `utils/` and `google_auth/`.
- [ ] Add flowcharts/architecture diagrams (optional).