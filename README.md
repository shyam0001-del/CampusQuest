# CampusQuest — Gamified College Assignment & Submission Platform

CampusQuest is an academic productivity and submission platform for college students and faculty. It turns academic coursework into an engaging quest experience where students submit assignments, lab experiments, practical records, and presentations on-time to earn gold coins, claim early-bird podium bonuses, maintain daily submission streaks, and climb the live academic leaderboard.

---

## 🚀 Key Features

### 🎓 For Students
- **Interactive Dashboard**: Welcome hero with personalized rank (#1, #2, etc.), level progression, current coin balance, and active submission streak counter.
- **Dynamic Task Hub**: Filter coursework across subjects, categories (*Assignments*, *Lab Activities*, *Presentations*, *Practical Records*, *Projects*), and urgency (*Pending*, *Submitted*, *Overdue*, *Due This Week*).
- **Flexible Submission Workflow**:
  - Direct file upload (*PDF, DOCX, ZIP, Code*) with server-side validation and persistent storage.
  - External URL (*GitHub repo, Google Docs, Drive, Figma, Slides*).
  - Rich text response with instant code formatting.
- **Gamified Economy & Early Bird Bonuses**:
  - Configurable base rewards (e.g. 100 coins).
  - **1st Valid Submitter**: +50 Bonus Coins (🥇 Gold Crown).
  - **2nd Valid Submitter**: +35 Bonus Coins (🥈 Silver Badge).
  - **3rd Valid Submitter**: +20 Bonus Coins (🥉 Bronze Badge).
  - Atomic database checks and server-generated timestamps ensure race conditions are safely resolved and only one student wins 1st place.
- **Live 3D-Podium Leaderboard**:
  - Animated gold, silver, and bronze podium cards.
  - Deterministic tie-breaking policy: *Points > Early Bonuses > Coins > Streak > Timestamp*.
  - Period filters: *Weekly*, *Monthly*, *Semester V*, and *All-Time*.
- **Calendar & Target System**:
  - Interactive monthly calendar with deadline markers.
  - Personal student targets (e.g., target 5 submissions/week, target 500 gold coins).
- **Achievement Showcase**:
  - Unlockable badges (*Trailblazer*, *Early Bird Champion*, *Consistency Champion*, *Lab Alchemist*, *Coin Tycoon*, etc.) with bonus XP and coin rewards.

### 👩‍🏫 For Teachers & Administrators
- **Dynamic Subject Management**: Create, edit, and archive courses with custom codes, colors, and syllabus details.
- **Task Publication Engine**: Define deadlines, base coins, custom early-bird bonus amounts, resubmission policies, and category types.
- **Faculty Verification Queue**: Administrators review and approve/reject faculty registrations before teaching permissions are granted.
- **Live Student Submission Roster**: Searchable roster showing *Submitted*, *Pending*, *Overdue*, and *Late* turn-ins with submission timestamps and direct download links.
- **One-Click CSV Export**: Export complete grade & submission rosters for university records.
- **Student Enrollment & Batch CSV Import**: Add individual students or batch import student records via CSV with automatic subject enrollment.
- **Auditable Ledger & Logs**: All coin allocations, admin actions, and submissions are logged immutably.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Recharts, Canvas-Confetti |
| **Backend** | Node.js, Express.js, TypeScript, Mongoose, Multer, Helmet, Morgan, Express-Rate-Limit |
| **Database** | MongoDB Atlas / MongoDB with compound indexes and atomic updates |
| **Authentication**| JWT (JSON Web Tokens) with bcrypt password hashing, role-based guards, and approval workflows |
| **Deployment** | Vercel (Frontend SPA) + Render (Backend Web Service) + MongoDB Atlas |

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18+ (tested on v20 & v24)
- **MongoDB**: Local MongoDB instance running on `localhost:27017` or MongoDB Atlas URI.

### 2. Clone and Setup
```bash
# Clone the repository
git clone <repo-url>
cd Innovate

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Start Development Servers
In two separate terminal windows:

**Terminal 1 (Backend - Port 5000):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend - Port 5173):**
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

*(Optional Local Development Seeding)*:
To populate local development with sample courses, students, and tasks:
```bash
cd backend
npm run seed
```
> Note: The seed utility is strictly prohibited in production environments to protect live institutional records.

---

## 🔐 Authentication & Initial Administrator Provisioning

CampusQuest uses role-based access control with server-side enforcement. No public registration pathway can create administrator accounts.

### 1. Student Registration
Students create accounts directly at `/register` and are assigned the `student` role with auto-approved status.

### 2. Faculty Registration & Approval Workflow
Faculty register at `/register` by selecting **Faculty Member**, submitting their department and academic designation. Faculty accounts are created with `pending` approval status. They cannot publish coursework until approved by an administrator in the **Admin Panel > Faculty Approvals** queue.

### 3. Provisioning the Initial Administrator (Bootstrap)
Run the one-time bootstrap script on your server or during initial deployment:

```bash
cd backend
npm run bootstrap:admin -- --email admin@university.edu --password <YourStrongPassword>
```

Alternatively, set server-side environment variables before running:
```bash
BOOTSTRAP_ADMIN_EMAIL=admin@university.edu
BOOTSTRAP_ADMIN_PASSWORD=<YourStrongPassword>
npm run bootstrap:admin
```

> **Security Guarantee**: The bootstrap script locks once the first administrator account exists in the database, preventing duplicate creation or privilege escalation.

### 4. Administrator Recovery Procedure
If an administrator is locked out or loses access, use the protected server-side CLI recovery command:

```bash
cd backend
npm run recover:admin -- --email admin@university.edu --password <NewSecurePassword123!>
```
All recovery actions are permanently recorded in the immutable system audit log.

---

## 📦 Production Build Commands

```bash
# Compile and build backend TypeScript:
cd backend
npm run build

# Compile and bundle frontend Vite assets:
cd ../frontend
npm run build
```

---

## 🌐 Production Deployment Guide

### A. MongoDB Atlas Setup (Empty Clean Database)

1. Create a free or dedicated cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user with `Read and write to any database` permissions.
3. Under **Network Access**, add `0.0.0.0/0` (or your cloud platform's outbound CIDR blocks).
4. In **Clusters > Connect > Connect your application**, copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/campusquest?retryWrites=true&w=majority
   ```
5. Ensure your production environment variable `MONGODB_URI` is set to this string. The backend will verify connection to Atlas on startup.

### B. Backend Deployment on Render

1. Create a **Web Service** on [Render.com](https://render.com).
2. Connect your Git repository.
3. Configure the build and start commands:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. Attach **Persistent Disk Storage** (Render > Disks tab):
   - **Name**: `campusquest-uploads`
   - **Mount Path**: `/var/data/uploads`
   - **Size**: `10 GB` (or desired quota)
5. Add the following **Environment Variables** in Render Dashboard:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode (activates security guards) |
   | `PORT` | `10000` | Port assigned by Render |
   | `TRUST_PROXY` | `1` | Informs Express of Render's 1-hop reverse proxy topology |
   | `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas cluster connection string (with database `/campusquest`) |
   | `JWT_SECRET` | `<random-32+-char-secret>` | Strong secret key for JWT signing (no default fallback) |
   | `JWT_EXPIRES_IN`| `7d` | Session duration |
   | `FRONTEND_URL` | `https://campusquest.vercel.app` | Your frontend URL for CORS policy enforcement |
   | `UPLOAD_DIR` | `/var/data/uploads` | Path to persistent disk mount |
6. Click **Deploy**.
7. **Verify Health Check**:
   ```bash
   curl -f https://<your-render-app>.onrender.com/health
   # Expected response: {"status":"ok","service":"CampusQuest Backend API","uptime":...}
   ```
8. Once healthy, bootstrap the initial administrator via Render Shell:
   ```bash
   npm run bootstrap:admin -- --email admin@university.edu --password <YourStrongPassword>
   ```

### C. Frontend Deployment on Vercel / Render Static Site

1. Import your Git repository into [Vercel](https://vercel.com) (or deploy via Render Static Site).
2. Set the **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. In **Environment Variables**, add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://<your-render-app>.onrender.com/api` | Full URL to backend API |
5. Deploy. `vercel.json` (or `render.yaml` rewrite rules) ensures client-side routing works on all routes without 404s.

### D. Automated Multi-Service Blueprint Deployment (Alternative)
You can deploy both services together using the repository's root [`render.yaml`](file:///Users/narojushyamprasad/Desktop/Innovate/render.yaml):
1. In Render Dashboard, select **New > Blueprint**.
2. Select the repository; Render will automatically configure both the backend service (with 10GB persistent disk) and the static frontend site.
3. Fill in secret environment variables (`MONGODB_URI`, `FRONTEND_URL`, `VITE_API_BASE_URL`) when prompted.

### E. Rollback Procedure for Failed Releases

If an unexpected regression or deployment failure occurs:
1. **Backend Rollback (Render)**:
   - Navigate to **Render Dashboard > Web Services > campusquest-backend > Deploys**.
   - Locate the last known good commit or deployment.
   - Click the three dots `...` next to the deploy and select **Rollback to this deploy** (or **Manual Deploy > Deploy a specific commit**).
   - Render will immediately re-run the previous build and restore the container while preserving the persistent disk `/var/data/uploads` and MongoDB Atlas collections.
2. **Frontend Rollback (Vercel / Render Static Site)**:
   - In Vercel: Go to **Project > Deployments**, find the last stable release, click `...` and select **Promote to Production** (instant zero-downtime rollback).
   - In Render Static Site: Go to **Deploys**, select the prior deploy, and click **Rollback**.
3. **Database Safeguard**:
   - CampusQuest migrations and index provisioning (`ensureDatabaseIndexes()`) are strictly idempotent and non-destructive. Rolling back frontend or backend code does not drop indexes or damage historical submission/coin records.

---

## 🛡️ Pre-Deployment Security Checklist

- [x] Helmet security headers applied on all API endpoints.
- [x] Rate limiting enabled on authentication endpoints (`/api/auth/login`, `/api/auth/register`).
- [x] Role-based access control (`adminOnly`, `facultyOrAdmin`, `approvedOnly`) protecting administrative workflows and academic publishing.
- [x] Strict whitelist on profile updates (`PUT /api/auth/profile`) preventing privilege escalation.
- [x] Public registration strictly sanitizes user role and enforces student assignment or faculty pending status.
- [x] Initial admin created through locked bootstrap script; no public admin registration routes exist.
- [x] Compound unique index on `{ task: 1, student: 1 }` prevents duplicate submissions.
- [x] Atomic bonus calculation prevents duplicate early-bird coin rewards.
- [x] Passwords securely hashed with `bcryptjs` (salt rounds: 10).
- [x] File upload size limited to 25MB and restricted to allowed academic mime types.
- [x] Sensitive environment variables isolated in `.env` and excluded via `.gitignore`.
- [x] Automated security test suite (`npm run test:security`) verified.
