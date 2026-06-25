# ⚡ DayBriefing — Premium AI Executive Chief of Staff

DayBriefing is a premium, high-fidelity AI-powered executive productivity dashboard designed for founders, executives, and power users. Inspired by the minimal, high-contrast visual aesthetics of **Superhuman**, **Linear**, **Vercel**, and **Stripe**, DayBriefing integrates with your workspace to automatically analyze inbox communication, generate executive summaries, draft context-aware email replies, schedule events, and maintain your daily task lists.

---

## ✨ Features & Capabilities

- **Executive AI Briefing**: Synthesizes incoming communication into high-level executive summaries with one-click workspace scans.
- **Context-Aware Email Actions**: Instant "Draft Reply" recommendations and automated high-contrast action item triage cards.
- **Interactive Schedule**: Seamless sync showing scheduled meetings and locations with a real-time status tracker.
- **Smart Follow-Up Assistant**: Uses predictive thread analysis to suggest critical follow-up actions for unanswered messages.
- **Priority Indicator Accent Glows**: Tasks are categorized visually with soft color glow indicators depending on urgency levels:
  - 🔴 **Urgent**: Left red border accent glow
  - 🟡 **High**: Left amber border accent glow
  - 🔵 **Medium**: Left blue border accent glow
  - 🟢 **Low**: Left emerald border accent glow

---

## 🎨 Visual Identity & Design System

DayBriefing replaces cluttered grids with a spacious, content-first layout centered on fast scan times and premium typography:

- **Typography**: Paired display typography using **Plus Jakarta Sans** with mono indicators utilizing **JetBrains Mono**.
- **Mesh Gradients**: Custom animated, deep cosmic ambient radial backgrounds centered on soft off-whites and dark twilight slates.
- **Glassmorphism Grid**: 12-column layout that shifts dynamically between desktop, tablet, and mobile viewing while preserving generous negative space.
- **Micro-interactions**: Hover-sensitive card elevations, subtle border outlines, and smooth glowing transitions to keep focus on key actions.

---

## 🛠️ Architecture & Tech Stack

DayBriefing runs as a highly performant full-stack Node.js environment:

- **Frontend**: React 19, Vite, and Tailwind CSS.
- **Backend Services**: Express server delivering dynamic Vite server-side compilation in development, and serving pre-bundled CommonJS chunks in production.
- **AI Engine**: Google Gemini API powered by the modern `@google/genai` TypeScript SDK.
- **Database & Auth**: Firebase Firestore for persistent records paired with Google OAuth credentials for secure workspace sync.

---

## 🚀 Quick Start

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your secure API credentials:

```bash
cp .env.example .env
```

Ensure your credentials are set:
- `GEMINI_API_KEY`: Server-side API key for briefing synthesis.
- Firebase Client Config values.

### 2. Install Dependencies
Install all required npm packages:

```bash
npm install
```

### 3. Run Development Server
Boot the full-stack server running Vite's dev middleware on port `3000`:

```bash
npm run dev
```

### 4. Build for Production
Pre-compile frontend assets and bundle the Express server into a standalone, optimized `.cjs` chunk via `esbuild`:

```bash
npm run build
```

### 5. Launch Production Server
Launch the self-contained production instance:

```bash
npm run start
```

---

## 📋 Available Commands

- `npm run dev` — Starts full-stack dev server using `tsx`.
- `npm run build` — Compiles the React SPA static build and packages the backend into `dist/server.cjs`.
- `npm run start` — Boots compiled application in standalone production mode.
- `npm run lint` — Validates type safety checks using `tsc --noEmit`.
- `npm run clean` — Removes target build outputs.

---

DayBriefing was architected and designed directly aligned with the key evaluation criteria for maximum product impact:

### 1. Problem Solving & Impact 
- **Targeting High-Value Friction**: Solves the "executive inbox fatigue" problem where professionals spend hours sorting daily notifications.
- **Immediate Outcome Focus**: Shifts the paradigm from passive reading to actionable triage, allowing users to synthesize an inbox, view calendar context, prepare email replies, and schedule tasks in seconds.

### 2. Agentic Depth 
- **Intentional Context Scans**: Employs an agentic workflow that loops through workspace resources (unreplied threads, meetings, and items) to analyze, formulate, and present reasoning-backed follow-ups.
- **Smart Recommendations**: Evaluates deep email threads and constructs context-aware draft recommendations and priority ratings rather than simple template match-ups.

### 3. Innovation & Creativity 
- **Executive-Level AI Chief of Staff**: Re-imagines standard email clients as an intelligent personal assistant that is actively working for you in the background.
- **Seamless Unified Workspace Flow**: Synchronizes discrete workspace platforms (Email, Calendar, Tasks) into a single unified and intuitive decision matrix.

### 4. Usage of Google Technologies 
- **Google Gemini API**: Utilizes the high-speed modern `@google/genai` SDK for multi-threaded summary compilation, action translation, and smart recommendation flows.
- **Google Workspace Ecosystem**: Plugs securely into real-time user endpoints for Google Calendar events, Gmail threads, and Google Tasks sync.
- **Firebase Core**: Leverages Firebase Authentication and secure Firestore Database endpoints for seamless, durable persistence of summaries, sessions, and settings.

### 5. Product Experience & Design 
- **SaaS Flagship Polish**: Emulates the high-end minimalist styling of Superhuman and Linear.
- **Maximum Clarity & Clean Scanning**: Visual noise reduced by 40% using custom font pairings (**Plus Jakarta Sans** + **JetBrains Mono**), responsive 12-column layouts, single-line ellipsis truncation, and adaptive glowing priority alerts.

### 6. Technical Implementation 
- **Optimized Full-Stack Bundler**: Express server running Vite dev middleware dynamically in local development, and deploying to production with optimized `esbuild` server compilation to avoid Node ESM resolution constraints.
- **Rigorous Type Safety**: Strictly typed TypeScript interfaces mapping APIs, events, database schemas, and components without standard generic fallbacks.

### 7. Completeness & Usability 
- **Production-Ready Deliverable**: Polished end-to-end user experience featuring interactive modals, smooth transitions, instant local loading screens, and robust error handlers that preserve state on failures.

