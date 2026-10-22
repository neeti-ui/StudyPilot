# StudyPilot 🚀
> **AI Study Companion Web App**
> *Amazon Developer Hackathon 2026 — Alexa+ Track*
> Built by a solo 2nd-year B.Tech CSE student on Windows.

---

## 📌 Phase: Stage 3 (AI Study Assistant & Functional Task Management)
StudyPilot provides an integrated study companion for 2nd-year B.Tech Computer Science students:
- **Task Management Engine**: Local persistent storage (`backend/data/tasks.json`) with atomic writes, serialized queue, corruption recovery, and local date tracking.
- **AI Study Assistant**: Powered by Google Gemini (`@google/genai`), customized for CSE coursework (DSA, C++, OOP, Operating Systems, DBMS, and exam prep).
- **Automated Study-Planning Workflow**: Connects pending tasks and deadlines with Gemini to generate realistic, prioritized revision timetables without duplicating task storage.
- **Responsive Dashboard**: Live task counts, deadline sorting (soonest first), completion progress bar, chat history, and notification toasts.

---

## 📂 Folder Map

```text
AMAZON DEVELOPER/
├── .gitignore                   # Ignores node_modules, .env, dist, logs, tasks.json
├── .env.example                 # Root environment variable template
├── package.json                 # Monorepo/orchestrator scripts (concurrently)
├── README.md                    # Setup, troubleshooting, and architecture guide
├── backend/
│   ├── .env.example             # Backend environment template (PORT, GEMINI_API_KEY)
│   ├── package.json             # Express, cors, dotenv, @google/genai ("type": "module")
│   ├── data/
│   │   ├── tasks.example.json   # Committed template with initial B.Tech CSE tasks
│   │   └── tasks.json           # Live local task database (git-ignored)
│   ├── src/
│   │   ├── server.js            # Express app entry & HTTP server listener
│   │   ├── routes/
│   │   │   ├── health.routes.js # GET /api/health
│   │   │   ├── dashboard.routes.js # GET /api/dashboard
│   │   │   ├── tasks.js         # GET, POST, PATCH, DELETE /api/tasks & /api/tasks/stats
│   │   │   └── ai.js            # GET /api/ai/status, POST /api/ai/chat, POST /api/ai/study-plan
│   │   └── services/
│   │       ├── taskService.js   # Reusable task CRUD with atomic file writes & queue
│   │       ├── aiService.js     # Gemini integration, CSE system prompts & study planner
│   │       └── dashboard.service.js # Reusable dashboard aggregation layer
│   └── test/
│       ├── tasks.test.js        # Automated unit tests for task operations
│       └── ai.test.js           # Automated unit tests with mocked AI provider
└── frontend/
    ├── package.json             # React 19 + Vite
    ├── vite.config.js           # Vite dev server + proxy (/api -> :5000)
    ├── index.html               # Web app entry point & meta tags
    └── src/
        ├── main.jsx             # React DOM root entry
        ├── App.jsx              # Main dashboard orchestration & state
        ├── App.css              # Custom responsive styles (desktop + mobile)
        ├── index.css            # Design tokens & color system
        └── components/
            ├── Header.jsx           # App navbar with health indicator & profile
            ├── Toast.jsx            # Action feedback toasts (success/error/info)
            ├── TaskForm.jsx         # Create & edit task modal with inline validation
            ├── TaskCardList.jsx     # Task cards with filters, edit, delete confirmation
            ├── UpcomingDeadlines.jsx# Soonest incomplete tasks sorted ascending
            ├── StudyProgress.jsx    # Real completion %, hours remaining & alerts
            └── ChatPanel.jsx        # Gemini AI companion, quick chips & study planner
```

---

## ⚙️ Prerequisites
- **Node.js**: `v20.0.0` or higher (tested on `v24.19.0`).
- **npm**: `v10.0.0` or higher (tested on `11.17.0`).
- **OS**: Windows 10/11 with PowerShell.
- **Browser**: Modern web browser (Chrome, Edge, Firefox, Brave).
- **Google Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com/) (no credit card required).

---

## 🔑 Setting up the AI Assistant (Google Gemini)

1. **Obtain an API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com/).
   - Sign in with your Google account and click **Get API key**.
   - Create a free key (Gemini Free Tier grants 15 requests/min and 1,500 requests/day at zero cost).
2. **Configure Environment**:
   - Create a file named `.env` inside the `backend/` folder (or copy from `backend/.env.example`):
     ```bash
     PORT=5000
     NODE_ENV=development
     GEMINI_API_KEY=your_actual_gemini_api_key_here
     GEMINI_MODEL=gemini-3.8-flash
     ```
   - *Note*: If `GEMINI_API_KEY` is omitted, the app runs normally; the chat panel simply displays a setup guide prompting you to add the key. It will never fake AI responses or leak secrets.

---

## 🚀 Setup & Running on Windows (PowerShell)

### Step 1: Install Dependencies
```powershell
npm.cmd run install:all
```

### Step 2: Run Both Servers Concurrently
```powershell
npm.cmd start
```
Or run individually in separate PowerShell windows:
- **Terminal 1 (Backend)**:
  ```powershell
  npm.cmd --prefix backend run dev
  ```
- **Terminal 2 (Frontend)**:
  ```powershell
  npm.cmd --prefix frontend dev
  ```

### Step 3: Run Automated Test Suites
Run the Node.js built-in automated tests covering both task management and AI services (with mocked providers):
```powershell
npm.cmd --prefix backend test
```

---

## 🌐 Local URLs & API Routes

| Service | Local URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | **[http://localhost:5173](http://localhost:5173)** | Vite + React interactive UI |
| **Backend API Root** | [http://localhost:5000/](http://localhost:5000/) | Express service information |
| **Health Check API** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | Returns `{ status: "ok", ... }` |
| **Task API** | [http://localhost:5000/api/tasks](http://localhost:5000/api/tasks) | Task CRUD (`GET`, `POST`, `PATCH`, `DELETE`) |
| **Task Statistics** | [http://localhost:5000/api/tasks/stats](http://localhost:5000/api/tasks/stats) | Completion rate, remaining minutes, overdue counts |
| **AI Status API** | [http://localhost:5000/api/ai/status](http://localhost:5000/api/ai/status) | Returns `{ configured: boolean, model: ... }` |
| **AI Chat API** | [http://localhost:5000/api/ai/chat](http://localhost:5000/api/ai/chat) | Multi-turn conversational endpoint |
| **AI Study Plan API** | [http://localhost:5000/api/ai/study-plan](http://localhost:5000/api/ai/study-plan) | Generates tailored timetable from active tasks |

---

## 📋 What Works vs What's Not Built Yet

### ✅ What Works
- **AI Study Companion**: Genuine multi-turn AI chat answering second-year B.Tech CSE topics (DSA, C++, OOP, OS, DBMS, exam revision) via Google Gemini.
- **Automated Study Planning Workflow**: One-click analysis of active dashboard tasks to generate a structured, day-by-day study schedule with priorities and study blocks.
- **Graceful Unconfigured Mode**: If no API key is set, shows a clear setup banner with direct links to Google AI Studio. Never fakes AI output.
- **Session Chat History & Reset**: Preserves conversational turns during the current session, with an instant `Clear Chat` button.
- **Persistent Task Management**: Full CRUD operations for tasks with local atomic file storage, serialized promise queue, and automatic corrupt file recovery.
- **Strict Server Validation**: Rejects unknown fields, invalid dates, and out-of-bounds parameters.
- **Responsive Dashboard UI**: Real-time task statistics, upcoming deadline list (soonest first), filters, modals, and toasts.
- **Comprehensive Automated Tests**: 19 automated backend tests covering all task and AI endpoints with mocked providers.

### ⏳ Boundaries (Not Built Yet)
- **Model Context Protocol (MCP)**: Future tool integration.
- **Alexa+ Track Voice Integration & Simulation**: Voice turn simulation and Echo device hooks.

---

## 🔧 Windows PowerShell Troubleshooting

### 1. `npm.ps1 cannot be loaded because running scripts is disabled`
- Use `npm.cmd` instead of `npm`:
  ```powershell
  npm.cmd start
  ```
- Or bypass execution policy for the process:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```

### 2. `Port 5000 or 5173 already in use`
- Terminate lingering Node processes on port 5000:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
  ```

---

*StudyPilot — Amazon Developer Hackathon 2026 (Alexa+ Track)*
