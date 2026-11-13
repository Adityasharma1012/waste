# WasteLess AI

**WasteLess AI** is a cross-platform household food-waste-reduction assistant built with **Expo (React Native + Expo Router + react-native-web)**, **Fastify + Zod (Node.js + TypeScript)**, and a shared **`@wasteless/core`** intelligence package.

It tracks pantry, fridge, and freezer items, distinguishes **"Use by" (safety)** from **"Best before" (quality)**, computes optimal multi-step **"Use soon"** plans via **A\* search**, scores recommendations with **4 configurable Utility Agents**, and answers food-safety questions via **BM25 RAG** over verified USDA/FoodSafety.gov/EPA/WRAP passages—while working **100% offline in Demo Mode with no API keys**.

---

## Monorepo Layout

```text
wasteless-ai/
├── app/                 # Expo SDK 58 app (Android + Web SPA via react-native-web)
├── server/              # Fastify API, LLMProvider interface, BM25 RAG, cache & metrics
├── packages/core/       # Shared types, rules engine, A* planner, 4 utility agents, impact constants, demo seed
├── knowledge/           # Verified RAG passages (JSON + SOURCES.md)
├── docs/                # ARCHITECTURE.md & IMPACT_METHODOLOGY.md
├── .env.example         # Root env reference (copy /server/.env.example and /app/.env.example)
└── package.json         # npm workspaces root
```

---

## Quick Start (Clean Checkout)

### Prerequisites
- **Node.js 20+** (tested on Node v24.19.0) and **npm 10+**
- Optional for Android APK local build: **JDK 17/21** + **Android SDK** (`ANDROID_HOME`)

### 1. Install Dependencies & Build Core
```bash
npm install
npm run build:core
```

### 2. Configure Environment (Optional — Works With Zero Keys)
- Server env: copy `server/.env.example` to `server/.env` (leave keys blank to run in `mock-offline` mode, or add `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` server-side only).
- App env: copy `app/.env.example` to `app/.env` (`EXPO_PUBLIC_API_URL=http://localhost:4000`, or `http://10.0.2.2:4000` on Android emulator). **Never place API keys in `/app/.env`.**

### 3. Run Backend & App in Development
```bash
# Terminal 1: Start Fastify API (port 4000)
npm run dev:server

# Terminal 2: Start Expo Web or Expo Go / Android Dev
npm run dev:web
# or: npm run dev:app
```

---

## Demo Mode (No API Key, No Network Required)

1. Launch the app (`npm run dev:web` or exported static site or Android APK).
2. Complete the **Welcome & Household Setup** onboarding screen and tap **"Start with Demo Pantry (12 Realistic Items)"**.
3. Explore all flows completely offline:
   - **Dashboard**: items grouped into `EXPIRED`, `USE TODAY`, `USE IN 1–3 DAYS`, and `SAFE`.
   - **Inventory**: search, filter, Add/Edit items, Delete with instant **Undo** toast.
   - **Action Plan**: A\* search plan, "Why this plan?", rejected alternatives, Utility Agents breakdown, and triggered Rules Engine (`RULE-SAFETY-*`, `RULE-URGENT-*`, `RULE-PRESERVE-*`, `RULE-QUALITY-*`).
   - **Recipes**: matched recipes, 3-day meal plan, freezing/storage tips, leftover ideas, and RAG Q&A (falls back to local rules when backend is unreachable).
   - **Insights**: food/money/CO2e saved **estimates** + **"How is this calculated?"** screen.
   - **Settings**: toggle Demo Mode, adjust Utility Agent weights, export JSON, inspect Sustainable-AI metrics (`% answered without an LLM`).

---

## LLM Provider Configuration (Server-Only)

Configure `/server/.env`:
- `LLM_PROVIDER=auto` (`auto` | `anthropic` | `openai` | `mock`)
- `ANTHROPIC_API_KEY=...` (`ANTHROPIC_MODEL=claude-sonnet-4-20250514`)
- `OPENAI_API_KEY=...` (`OPENAI_MODEL=gpt-4o-mini`)

API keys are read strictly by `/server` and never bundled into `/app`.

---

## Testing & Verification

```bash
# Run all Vitest unit & integration suites (packages/core + server)
npm test

# Typecheck all workspaces
npm run typecheck
```

---

## Web Build & Deployment

### Build Static Web Bundle
```bash
npm run build:core
cd app
npx expo export --platform web
```
Output is written to `app/dist/`. Preview locally with `npx serve app/dist`.

### Deploy Website (Vercel / Netlify)
- **Vercel**: Connect repo, set root directory to `app` (or run monorepo build `npm run build:core && npm --workspace=app run export:web`), output directory `app/dist`, and set environment variable `EXPO_PUBLIC_API_URL` to your deployed backend URL. Add SPA rewrite (`/(.*) -> /index.html`).
- **Netlify**: Build command `npm install && npm run build:core && cd app && npx expo export --platform web`, publish directory `app/dist`, add `_redirects` (`/* /index.html 200`), and set `EXPO_PUBLIC_API_URL`.

### Deploy Backend (Render / Railway / Fly.io)
- **Render / Railway**: Build command `npm install && npm run build:server`; Start command `npm --workspace=@wasteless/server run start`. Set `PORT`, `CORS_ORIGIN`, `LLM_PROVIDER`, and optional `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` in the platform's secret env settings.
- **Fly.io**: Run `fly launch` targeting `server/` (exposing port `4000`) with `npm run build:server` in Dockerfile and `fly secrets set` for API keys.

---

## Building the Android APK

### Option A: Local Gradle Release Build (Requires JDK 17/21 + Android SDK)
```bash
# Ensure JAVA_HOME and ANDROID_HOME are set
npm run build:core
cd app
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
# Windows PowerShell (single-ABI build verified locally for arm64-v8a):
.\gradlew.bat assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
```
The release APK is generated at `app/android/app/build/outputs/apk/release/app-release.apk` (note: Expo prebuild configures `signingConfigs.debug` for `release` builds for local/preview sideloading; configure your own release keystore in `android/app/build.gradle` before Play Store distribution).

> **Windows Ninja 260-character path note:** If `npx expo prebuild --clean` regenerates `app/android/` on Windows and CMake/Ninja reports `Filename longer than 260 characters`, add `buildStagingDirectory file("../../../.cxx")` inside `android.externalNativeBuild.cmake` and `arguments "-DCMAKE_OBJECT_PATH_MAX=250"` inside `android.defaultConfig.externalNativeBuild.cmake` in `app/android/app/build.gradle` (already applied to the generated project here).

### Option B: Cloud Build via EAS
```bash
npm install -g eas-cli
eas login
cd app
eas build -p android --profile preview
```

---

## Troubleshooting

- **PowerShell `npm.ps1` execution policy blocked on Windows**: Use `npm.cmd` / `npx.cmd` or run from Command Prompt / Git Bash.
- **Android emulator cannot reach `localhost:4000`**: Set `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` (or update Backend API URL in the in-app **Settings** tab).
- **Web export missing routes or stale `@wasteless/core`**: Run `npm run build:core` before `npx expo export --platform web`.
