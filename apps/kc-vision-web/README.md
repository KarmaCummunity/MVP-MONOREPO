# KC Vision Web (`@kc/vision-web`)

🚧 **POC / PROTOTYPE ONLY** 🚧

Static SRS demonstration UI for Karma Community — **100% FAKE DATA, NO BACKEND, NO API**.

---

## ⚠️ Important Notice

This is a **Proof of Concept (POC)** designed to demonstrate the **Karma Community platform idea** with **minimal effort and maximum visual demonstration**.

### What this IS:
- ✅ Visual demonstration of all platform features
- ✅ Interactive UI with routing and navigation
- ✅ Fake data for users, posts, donations, rides, items, chat, and more
- ✅ Mock authentication (no real Google login, no JWT)
- ✅ Persona-based role switching for testing different user types
- ✅ Hebrew/English i18n support
- ✅ Responsive design with Tailwind CSS

### What this is NOT:
- ❌ **NO real backend** - everything is client-side only
- ❌ **NO data persistence** - refreshing the page may lose some state
- ❌ **NO real authentication** - Google login is completely mocked
- ❌ **NO validation** - forms don't validate properly
- ❌ **NO error handling** - expect things to break
- ❌ **NO production-ready code** - this is demo-quality only

---

## 🚀 Quick Start

### From monorepo root:
```bash
npm run dev:vision
```

### Or from this directory:
```bash
npm install
npm run dev
```

Then open **http://localhost:5173** (or the port Vite assigns).

---

## 🎭 Available Personas (Mock Users)

The app uses **persona-based authentication** to simulate different user roles. Click any button on the login page:

| Persona | Role(s) | Description |
|---------|---------|-------------|
| **Guest** | None | Limited access, read-only |
| **Community Member** | `user` | Regular platform user |
| **Volunteer** | `volunteer`, `user` | Active volunteer in organizations |
| **Volunteer Manager** | `volunteer_manager`, `volunteer`, `user` | Manages volunteers |
| **Operator** | `operator`, `user` | Shiduchim Tov operator |
| **Org Admin** | `org_admin`, `volunteer`, `user` | Organization administrator |
| **Admin** | `admin`, `user` | Platform moderator |
| **Super Admin** | `super_admin`, `user` | Full platform access |

**Switch personas** anytime via the header dropdown or by logging out and back in.

---

## 📁 Fake Data

All data lives in **`src/fixtures/`** and **`src/modules/users/fixtures/`**:

- **20+ users** with realistic Hebrew profiles
- **30+ posts** (feed items with give/request intents)
- **12+ rides** (carpooling offers)
- **15+ items** (shared items for donation)
- **15+ conversations** (chat threads)
- **Donation categories** (30 categories including Shiduchim Tov)
- **Notifications, challenges, stats** - all mocked

**Nothing is saved to a database.** Changes persist only in memory or localStorage (for persona selection).

---

## 🗺️ SRS Mapping

See [`src/VISION_SRS_MAP.md`](src/VISION_SRS_MAP.md) for detailed mapping of UI routes to SRS functional requirements.

Requirements source of truth: `docs/SSOT/SRS/`.

---

## 🛠️ Tech Stack

- **Vite 5** - Fast dev server and build tool
- **React 19** - UI framework
- **TypeScript** - Type safety
- **React Router 7** - Client-side routing
- **Zustand** - Minimal state management (no async, no API calls)
- **Tailwind CSS 3** - Utility-first styling
- **react-i18next** - Hebrew (default) + English, RTL support
- **Recharts** - Charts for statistics page
- **Lucide Icons** - Icon library

---

## 📜 Scripts

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Build for production (TypeScript + Vite)
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

---

## 🎨 Features Demonstrated

### Core Modules (all with fake data):
1. **Authentication** - Mock Google login, email login, persona switching
2. **Feed** - Posts with anonymity levels, filtering, sorting
3. **Donations** - 30 categories, grid view, category pages
4. **Rides** - Carpooling list, ride details
5. **Items** - Shared items, request/offer flow
6. **Chat** - Conversation list, message threads
7. **Users** - Profiles, discover page, hierarchy view
8. **Challenges** - Community challenges
9. **Notifications** - Mock notifications
10. **Statistics** - Charts with fake data
11. **Admin** - Admin panel (role-restricted)
12. **Operator Workspace** - Shiduchim Tov matching queue (role-restricted)

### Additional Features:
- **Multilingual** - Hebrew (RTL) and English
- **Role-based access** - Different personas see different content
- **Responsive** - Mobile-friendly design
- **Dark mode support** - Some users have dark mode enabled (mocked)

---

## 🐛 Known Limitations

- **No backend** - all data is hardcoded or stored in memory
- **No form validation** - you can submit empty forms
- **No error boundaries** - crashes may occur
- **No real-time updates** - no websockets, no polling
- **No image uploads** - avatars are from DiceBear API
- **No pagination** - all lists show all items
- **No search** - filtering is basic client-side only
- **No tests** - this is a POC, not production code

---

## 🎯 Goals of this POC

1. **Demonstrate the platform vision** to stakeholders
2. **Validate UX flows** without backend complexity
3. **Test multilingual support** (Hebrew/English)
4. **Showcase role-based access** patterns
5. **Rapid iteration** on UI/UX before investing in backend

---

## 📞 Questions?

This is a POC. Don't use it in production. If you have questions about the SRS or architecture, see `docs/SSOT/`.

---

**🚧 Remember: This is NOT production-ready. It's a visual prototype with fake data only. 🚧**
