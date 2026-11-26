# TVK Digital Governance CRM - Coimbatore District
### Professional Full-Stack District Grievance & Cadre Management System (MERN Stack)

Modeled and enhanced directly from the reference portal at [cbesouthdashboard.vercel.app](https://cbesouthdashboard.vercel.app/home).

---

## 🏛️ System Overview

The **TVK Digital Governance CRM** is an enterprise-grade district administration portal engineered specifically for **Tamilaga Vettri Kazhagam (TVK) Coimbatore District**. It provides seamless, real-time coordination between citizens, ward office bearers, and government departments (Corporation, TWAD, TANGEDCO, Highways, and Police).

### 🌟 Key Features
1. **Bilingual TVK Authentication Portal**:
   - Styled with TVK crimson & gold brand theme.
   - Secure JWT and `bcryptjs` encrypted credentials.
   - Quick one-click demo credentials for District Admin and Ward Officer.
2. **Command Center Dashboard**:
   - 4 Dynamic MongoDB KPI Cards (Total Issues, Resolved Issues, Total Members, Total Wards).
   - 6 Quick Action Navigation Cards (Coimbatore District, Members, Issues, Dashboard, Achievements & Projects, Department Officers).
   - Monthly Performance Trends (Area Chart) & Domain Breakdown (Recharts).
   - Ward Grievance Load and Recent Petitions Feed.
3. **Coimbatore District Hierarchy**:
   - 10 Assembly Constituencies (*Coimbatore South, Coimbatore North, Singanallur, Kavundampalayam, Thondamuthur, Kinathukadavu, Pollachi, Valparai, Sulur, Mettupalayam*).
   - 5 Administrative Zones (North, South, East, West, Central).
   - Ward Deep-Dive Dashboards with dedicated KPI counters for Members and Grievances.
4. **TVK Cadre & Member Management**:
   - Master Cadre Roster with Name, Mobile, Gender, Ward, and Designation filters.
   - Comprehensive Profile Card with Printable Official TVK Membership Badge.
   - Excel export of all filtered cadre records.
5. **Master Grievance & Issue Repository**:
   - Full lifecycle status management (*Pending, Under Review, In Progress, Resolved, Rejected*).
   - Inter-departmental assignment (TWAD, TANGEDCO, Corporation, Highways).
   - Chronological Activity Timeline and Audit Trail.
   - Excel export of petitions.
6. **Executive Analytics Dashboard**:
   - Interactive date filters (*Today, This Week, This Month, This Year, Custom Date Range*).
   - Area, Bar, Donut, and Horizontal Ranking charts powered by Recharts.
7. **Achievements & Community Projects**:
   - Tracking completed and ongoing civil works with progress percentage bars and budget data.
8. **Government Department Officers Directory**:
   - Direct nodal officer contact directory for TWAD, TANGEDCO, Highways, Corporation, and Traffic Police.
9. **AI Content Generator**:
   - Produces official Press Releases, Social Media Posts, Public Notices, and Speeches in formal **Tamil (செந்தமிழ் நடை)** and **English**.
   - Server-side Gemini AI integration with saved communications archive.
10. **TVK AI BOT**:
    - Intelligent conversational assistant grounded in **live MongoDB CRM metrics**.
    - Answers instant district queries: *"Which ward has the highest number of issues?"*, *"How many grievances are pending?"*, *"Show the executive summary"*.
11. **Comprehensive Reporting & Export**:
    - One-click Excel (.xlsx) and printable reports across Grievances, Members, Wards, and Departments.
12. **Settings & Role-Based Access Control**:
    - Admin Profile, Password Management, User Provisioning, and Security Audit Logs.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS, React Router DOM v6, Lucide React Icons, Framer Motion, Recharts, Axios, XLSX, jsPDF.
- **Backend**: Node.js, Express.js (REST API, ES Modules), JWT Authentication, bcryptjs, Multer, XLSX.
- **Database**: MongoDB Atlas / Mongoose ODM (with automatic fallback to local memory engine for immediate zero-config testing).

---

## 🚀 Quick Start Guide

### 1. Default Authorized Credentials
| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **District Administrator** | `admin` | `adminpassword123` | Full Superadmin Control |
| **Ward Officer** | `wardofficer` | `password123` | Ward-Level Operations |

*(You can also use the one-click demo login buttons directly on the login screen)*

### 2. Running Backend Server
```bash
cd backend
npm install
npm run dev
```
- Server starts on `http://localhost:5000`
- REST API Base: `http://localhost:5000/api`

### 3. Running Frontend Client
```bash
cd frontend
npm install
npm run dev
```
- Client runs on `http://localhost:5173`
- Pre-configured Vite proxy routes all `/api` and `/uploads` requests to the backend server.

### 4. Production Build
```bash
cd frontend
npm run build
```
Creates an optimized, production-ready bundle in `frontend/dist/`.

---

## 📂 Project Directory Structure

```
CRM/
├── backend/
│   ├── config/              # MongoDB connection & local fallback engine
│   ├── controllers/         # Modular Express controllers for all 12 modules
│   ├── middleware/          # JWT auth, error handlers, and file uploads
│   ├── models/              # Mongoose schemas (Users, Wards, Members, Issues, etc.)
│   ├── routes/              # Express REST API routes
│   ├── seeds/               # Comprehensive Coimbatore District initial seed data
│   ├── services/            # Gemini AI service & RAG database context provider
│   ├── .env                 # Environment variables
│   ├── .env.example         # Environment template
│   ├── package.json
│   └── server.js            # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/      # Common UI (StatCard, DataTable, Modal, Badges, etc.)
│   │   ├── context/         # AuthContext and NotificationContext (Toasts)
│   │   ├── pages/           # Dedicated pages for all modules
│   │   │   ├── auth/        # Login, Forgot Password, Reset Password
│   │   │   ├── dashboard/   # Main CRM Dashboard
│   │   │   ├── district/    # Constituencies & Ward Deep-Dive Dashboards
│   │   │   ├── members/     # Cadre Roster & ID Badge View
│   │   │   ├── issues/      # Grievances Repository & Activity Timeline
│   │   │   ├── analytics/   # Executive Recharts Dashboard
│   │   │   ├── projects/    # Civic Achievements & Projects
│   │   │   ├── officers/    # Department Officers Directory
│   │   │   ├── ai/          # AI Content Generator & TVK AI BOT
│   │   │   ├── reports/     # Reports, Audits & Excel Export
│   │   │   └── settings/    # Profile, Security, User Management
│   │   ├── services/        # Axios API client
│   │   ├── App.jsx          # Protected route routing engine
│   │   ├── index.css        # Tailwind & custom scrollbar styles
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🔒 Environment Configuration (`backend/.env`)

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/tvk_crm?retryWrites=true&w=majority
JWT_SECRET=tvk_coimbatore_digital_governance_crm_secret_key_2026
CLIENT_URL=http://localhost:5173
AI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```
*Note: If `MONGODB_URI` is left blank, the backend automatically initializes an in-memory MongoDB engine with full CRUD and seed data support for zero-config testing.*
