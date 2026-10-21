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
- **Dynamic Subject Management**: Create, edit, and archive courses (*DBMS, OS, Computer Networks, Web Tech*, etc.) with custom codes, colors, and syllabus details.
- **Task Publication Engine**: Define deadlines, base coins, custom early-bird bonus amounts, resubmission policies, and category types.
- **Live Student Submission Roster**: Searchable roster showing *Submitted*, *Pending*, *Overdue*, and *Late* turn-ins with submission timestamps and direct download links.
- **One-Click CSV Export**: Export complete grade & submission rosters for university records.
- **Student Enrollment & Batch CSV Import**: Add individual students or batch import hundreds of student records via CSV with automatic subject enrollment.
- **Auditable Ledger & Logs**: All coin allocations, admin actions, and submissions are logged immutably.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Recharts, Canvas-Confetti |
| **Backend** | Node.js, Express.js, TypeScript, Mongoose, Multer, Helmet, Morgan, Express-Rate-Limit |
| **Database** | MongoDB / MongoDB Atlas with compound indexes and atomic updates |
| **Authentication**| JWT (JSON Web Tokens) with bcrypt password hashing and role-based guards |
| **Deployment** | Vercel (Frontend SPA) + Render (Backend Web Service) + MongoDB Atlas |

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18+ (tested on v24)
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

### 3. Seed Database with Rich Demo Data
Run the automated seed script to populate demo courses (DBMS, Operating Systems, Computer Networks, Web Technologies), realistic tasks with upcoming deadlines, sample submissions, and student leaderboard profiles:
```bash
cd backend
npm run seed
```

### 4. Start Development Servers
In two separate terminal windows or using the root scripts:

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

---

## 🔑 Demo Credentials (1-Click Instant Login Available)

On the login page (`/login`), click either the **Student Demo** or **Faculty Demo** button for instant access:

| Role | Name | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Student (Rank #1)** | Alex Rivera | `alex@campusquest.edu` | `Password@123` | Top ranker, 485 coins, 6-day streak |
| **Student (Rank #2)** | Priya Sharma | `priya@campusquest.edu` | `Password@123` | 395 coins, 4-day streak |
| **Student (Rank #3)** | Liam O'Connor | `liam@campusquest.edu` | `Password@123` | 310 coins, 3-day streak |
| **Faculty / Admin** | Dr. Sarah Chen | `teacher@campusquest.edu`| `Password@123` | Course publisher & admin roster access |

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

### A. Backend Deployment on Render

1. Create a **Web Service** on [Render.com](https://render.com).
2. Connect your Git repository.
3. Configure the build and start commands:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. Add the following **Environment Variables** in Render Dashboard:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Port assigned by Render |
   | `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas cluster connection string |
   | `JWT_SECRET` | `<random-32-char-secret>` | Secret key for JWT signing |
   | `JWT_EXPIRES_IN`| `7d` | Session duration |
   | `FRONTEND_URL` | `https://campusquest.vercel.app` | Your Vercel frontend URL for CORS |
   | `UPLOAD_DIR` | `uploads` | Local or mounted disk directory |
5. Click **Deploy**. Verify the health check at `https://<your-render-app>.onrender.com/health`.

### B. Frontend Deployment on Vercel

1. Import your Git repository into [Vercel](https://vercel.com).
2. Set the **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. In **Environment Variables**, add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://<your-render-app>.onrender.com/api` | Full URL to backend API |
5. Deploy. `vercel.json` already contains the SPA rewrite rules to ensure client-side routing works seamlessly on deep page refreshes.

### C. MongoDB Atlas Setup

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user with `Read and write to any database` permissions.
3. Under **Network Access**, whitelist Render's outbound IPs or `0.0.0.0/0` with secure password authentication.
4. Copy the connection string and set it in your Render environment variables.
5. In your production deployment, run the seed script once or create your courses dynamically through the Admin Panel.

---

## 🛡️ Pre-Deployment Security Checklist

- [x] Helmet security headers applied on all API endpoints.
- [x] Rate limiting enabled on authentication endpoints (`/api/auth/login`, `/api/auth/register`).
- [x] Role-based access control (`adminOnly`) protecting all subject/task creation, student enrollment, and CSV downloads.
- [x] Compound unique index on `{ task: 1, student: 1 }` prevents double submissions.
- [x] Atomic bonus calculation prevents duplicate early-bird coin rewards.
- [x] Passwords securely hashed with `bcryptjs` (salt rounds: 10).
- [x] File upload size limited to 25MB and restricted to allowed academic mime types.
- [x] Sensitive environment variables isolated in `.env` and excluded via `.gitignore`.
