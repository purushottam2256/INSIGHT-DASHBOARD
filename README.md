<div align="center">
  <img src="./src/assets/logo.png" alt="Insight Logo" width="180" />
  <h1>INSIGHT  -v1.0.0</h1>
  <p><strong>The Definitive Institutional Operating System.</strong></p>
  <p><em>Engineered for Scale, Speed, and Deep Academic Telemetry.</em></p>
  
  <p>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
    <img alt="React" src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" />
    <img alt="Framer Motion" src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" />
  </p>
</div>

---

## 🚀 Architectural Overview

INSIGHT Dashboard is a monolithic React-based web dashboard designed to operate alongside the native **Attend-Me** mobile application. Serving Principal, Management, and HOD roles, it handles live attendance processing, multi-stage leave workflows, smart clash-free timetable generation, secure broadcast networks, and deep comparative analytics. It utilizes **Supabase** (Postgres + Auth + Storage + Edge Functions) for a heavily secured, real-time backend infrastructure.

---

## 💎 Core Capabilities & Workflows

### 1. 🛡️ Identity & Roster Management (Registration Module)

Administrators manage all user identities (Faculty and Students) completely within the platform.

- **Single Entity Entry:** Add individuals manually via intuitive forms (supports mid-semester transfers).
- **Mass CSV Architecture:** Upload thousands of users simultaneously using standardized `.csv` templates.
- **Deep Sync:** Faculty credentials provisioned here automatically grant access to the Attend-Me iOS/Android app. HODs are automatically restricted to viewing only their department’s data via Row-Level Security (RLS).

### 2. 📅 Timetable Architect

A complete end-to-end grid builder and curriculum planner.

- **Configuration Stage:** Link subjects to dedicated faculty and set maximum lecture quotas.
- **Class Incharges:** Define specific class incharges (up to two) who are pinned to the generated grid overview.
- **Auto vs. Manual Engine:**
  - _Auto:_ Runs a sophisticated algorithm to assign periods while preventing faculty time-clashes across different classes.
  - _Manual:_ Full drag-and-drop sandbox for direct manipulation.

### 3. 📊 Real-Time Attendance & Analytics matrix

The command center for live and historical classroom telemetry.

- **Mobile-to-Cloud Sync:** Data collected in-class via the Attend-Me mobile app reflects on the dashboard instantly without page refreshes.
- **Bird’s-Eye Overview:** View month-long heatmaps and matrices for every student in a given class.
- **Administrative Overrides:** Principals/HODs possess clearance to edit past sessions or issue On-Duty (OD) statuses, protecting aggregate calculations.
- **Benchmarking & Compliance:** Isolate sub-75% (low attendance) and sub-65% (detained) students instantly across the entire campus.

### 4. 🔀 The Compare Array

Compare multiple classes, years, or entire departments natively.

- **Multi-Dimensional Visuals:** Combine 2 or more classes into rendering engines executing at 60fps (Area, Line, and Bar modes).
- **Predictive Trends:** Track week-over-week or month-over-month engagement drops.

### 5. 📑 Two-Stage Leave Permission Engine

A strict, unalterable hierarchy for approving absences.

- **Faculty Pipeline:** Faculty submit leaves via mobile. The dashboard dynamically routes the request to their respective HOD. If the HOD approves, it immediately routes to the Principal for the final sign-off.
- **Student Leave Tracking:** Administrators can input block-leaves or multi-day permissions for students, visually highlighting their absence blocks in the attendance matrices so their base calculation percentages are never negatively impacted.
- **Contextual Comments:** Approvers can append reasons or notes when accepting/declining requests.

### 6. 📝 Export & Auditing (Reports Generation)

Data is strictly locked in the ecosystem unless natively exported.

- **Encrypted `.xlsx` Serialization:** Generate pixel-perfect, color-coded, heavily formatted Excel sheets parsing daily/weekly/monthly statistics using `exceljs`.
- **Global Auditing:** Monitor who logged in, who took attendance, and who edited what record via the centralized `Audit Logs` module.

### 7. 📡 Institutional Broadcast Hub

Targeted push-based internal communication.

- **Audience Control:** Principals can blast messages to 'All Staff', 'Only HODs', or 'Specific Departments'. HODs can broadcast solely to their department.
- **FCM Push Notifications:** Important system events (e.g., Leave approvals, new broadcasts, resolved issues) trigger a Supabase Edge Function tying into Firebase Cloud Messaging (FCM) to ping devices instantly.

### 8. 🎫 Issues & Support Ticketing

A complete, built-in feedback loop for the platform itself.

- **Glassmorphic UI:** A stunning reporting interface where users drop bugs or feature requests.
- **Binary Attachments:** Users can attach screenshots to tickets. These are securely bucketed into Supabase Storage (`avatars` bucket).
- **Admin Resolution:** Developers and Admins review the Global Reports Map, transitioning tickets from `Open` -> `Investigating` -> `Resolved`. Resolving a ticket triggers an automated FCM payload to the original reporter.

### 9. 🔍 Omnibox Search (Ctrl + K)

Navigate the entire platform at the speed of thought.

- Press `Ctrl + K` (or `Cmd + K`) anywhere to summon the global spotlight search.
- Look up specific students, faculty profiles, pages, or settings with sub-millisecond route injection.

---

## 🔒 Security Posture & Architecture

We maintain an aggressive security posture via **Postgres Row-Level Security (RLS)**.

1.  **Auth Layer:** Supabase GoTrue manages JWTs. No passwords exist in plaintext.
2.  **Strict Department Silos:** A faculty member in CSE physically cannot query the `public.profiles` or `public.attendance` rows attached to ECE. The DB policy drops the request at the Postgres layer before it hits the API.
3.  **Role Escaping:** Users have explicit ENUM roles (`admin`, `hod`, `faculty`). Attempting to mount Admin components (like the "System Config" or "Global Issues Map") checks the JWT context natively.

---

## 🛠️ Development Setup & Deployment

### Prerequisites

- Node.js (`v18` or `v20` LTS)
- npm or yarn
- A Supabase Project

### 1. Cloning & Dependencies

```bash
git clone https://github.com/your-org/insight-os.git
cd insight-os
npm install
```

### 2. Environment Variables

Create a `.env` file at the root of the project.

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_FIREBASE_FCM_SERVER_KEY=your_fcm_key (optional, for notifications)
```

### 3. Database Hydration

The entire schema architecture resides in `database/schema.sql`.

1.  Navigate to your Supabase SQL Editor.
2.  Paste the contents of `schema.sql`.
3.  Execute to construct all tables, Views, RPC triggers, and RLS policies.
4.  Ensure you create the `avatars` bucket in the Storage tab to permit image uploads for the Helpdesk and Profiles.

### 4. Running the Dev Server

```bash
npm run dev
```

The App will locally mount at `http://localhost:5173`.

### 5. Deploying FCM Edge Functions (Optional)

If you require push notifications to function directly:

```bash
supabase login
supabase functions deploy send-fcm
```

Ensure your Firebase service account keys are injected into your Supabase vault so the edge function can authorize payloads.

---

## 🎨 Asset Guidelines (Design Systems)

- **Tailwind CSS Config**: Colors rely on a carefully constructed palette built on `primary` (orange/amber gradient), matched against dense layout breakpoints.
- **Glassmorphism**: Ensure new components use the established `bg-card/50 backdrop-blur-xl border-border/50` utility chain to match the premium macOS-style aesthetics.
- **Iconography**: Strict adherence to `lucide-react` for consistent stroke widths.

---

<p align="center">
  <b>INSIGHT Dashboard System Manual</b> • Crafted by PJ.
</p>
