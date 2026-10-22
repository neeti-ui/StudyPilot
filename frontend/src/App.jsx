import React, { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import TaskCardList from "./components/TaskCardList";
import TaskForm from "./components/TaskForm";
import UpcomingDeadlines from "./components/UpcomingDeadlines";
import StudyProgress from "./components/StudyProgress";
import ChatPanel from "./components/ChatPanel";
import Toast from "./components/Toast";
import SampleDataBadge from "./components/SampleDataBadge";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "tasks" | "chat"
  const [taskFilter, setTaskFilter] = useState("all");

  // Real task data states
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    remaining: 0,
    completionPercentage: 0,
    overdueCount: 0,
    dueSoonCount: 0,
    totalEstimatedMinutesRemaining: 0
  });

  // UI / Form / Toast states
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskLoadError, setTaskLoadError] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [formServerErrors, setFormServerErrors] = useState({});
  const [toast, setToast] = useState(null); // { message, type: "success" | "error" | "info" }

  // Background dashboard sample data (student profile, weekly hours preview)
  const [dashboardData, setDashboardData] = useState(null);
  const [backendHealth, setBackendHealth] = useState({ healthy: false, loading: true, error: null });

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  // Check backend health
  const checkHealth = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setBackendHealth({ healthy: true, loading: false, data, error: null });
      } else {
        setBackendHealth({ healthy: false, loading: false, error: `HTTP ${res.status}` });
      }
    } catch (err) {
      setBackendHealth({ healthy: false, loading: false, error: err.message });
    }
  };

  // Fetch real tasks and stats
  const fetchTasksAndStats = useCallback(async () => {
    setLoadingTasks(true);
    setTaskLoadError(null);
    try {
      const [tasksRes, statsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/tasks/stats")
      ]);

      if (!tasksRes.ok) {
        throw new Error(`Failed to load tasks (HTTP ${tasksRes.status})`);
      }
      if (!statsRes.ok) {
        throw new Error(`Failed to load task stats (HTTP ${statsRes.status})`);
      }

      const tasksData = await tasksRes.json();
      const statsData = await statsRes.json();

      setTasks(tasksData);
      setTaskStats(statsData);
      setTaskLoadError(null);
    } catch (err) {
      console.error("Error loading tasks:", err);
      setTaskLoadError(err.message || "Unable to reach server");
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // Fetch sample dashboard data (for Alex Sharma profile & sample progress breakdown)
  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error("Failed to load /api/dashboard:", err);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchTasksAndStats();
    fetchDashboardData();
  }, [fetchTasksAndStats]);

  // Create or Update task
  const handleSaveTask = async (taskPayload, existingId) => {
    setIsSavingTask(true);
    setFormServerErrors({});

    try {
      const isEditing = Boolean(existingId);
      const url = isEditing ? `/api/tasks/${existingId}` : "/api/tasks";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskPayload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 && data.fields) {
          setFormServerErrors(data.fields);
          showToast("Please correct the highlighted field errors.", "error");
          return false;
        }
        throw new Error(data.error || "Failed to save task");
      }

      showToast(
        isEditing
          ? `Task "${data.title}" updated successfully.`
          : `Task "${data.title}" created successfully.`,
        "success"
      );

      setShowTaskForm(false);
      setTaskToEdit(null);
      await fetchTasksAndStats();
      return true;
    } catch (err) {
      console.error("Save task error:", err);
      showToast(err.message || "Failed to save task. Check server connection.", "error");
      return false;
    } finally {
      setIsSavingTask(false);
    }
  };

  // Toggle status complete / todo
  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "completed" ? "todo" : "completed";
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update task status");
      }

      const updated = await res.json();
      showToast(
        nextStatus === "completed"
          ? `Completed "${updated.title}"! 🎉`
          : `Marked "${updated.title}" as active.`,
        "info"
      );

      await fetchTasksAndStats();
    } catch (err) {
      console.error("Toggle task error:", err);
      showToast(err.message || "Network error updating task.", "error");
    }
  };

  // Delete task
  const handleDeleteTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task");
      }

      showToast("Task deleted successfully.", "info");
      await fetchTasksAndStats();
    } catch (err) {
      console.error("Delete task error:", err);
      showToast(err.message || "Failed to delete task.", "error");
    }
  };

  const handleOpenCreate = () => {
    setTaskToEdit(null);
    setFormServerErrors({});
    setShowTaskForm(true);
  };

  const handleOpenEdit = (task) => {
    setTaskToEdit(task);
    setFormServerErrors({});
    setShowTaskForm(true);
  };

  const handleCloseForm = () => {
    setShowTaskForm(false);
    setTaskToEdit(null);
    setFormServerErrors({});
  };

  return (
    <div className="app-shell">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* App Header */}
      <Header
        backendStatus={backendHealth}
        student={dashboardData?.student}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Global Status Banner */}
      <section className="global-sample-banner" role="banner">
        <div className="banner-content">
          <span className="live-status-pill">● Stage 3: AI Companion & Tasks Active</span>
          <span className="banner-text">
            <strong>StudyPilot:</strong> Real task management, live statistics, and <strong>Gemini AI study assistance & revision planning</strong> are active.
          </span>
          <button
            className="banner-refresh-btn"
            onClick={() => {
              checkHealth();
              fetchTasksAndStats();
            }}
          >
            ↻ Sync
          </button>
        </div>
      </section>

      {/* Main Container */}
      <main className="main-content-layout">
        {/* Loading / Error states */}
        {taskLoadError && (
          <div className="network-error-banner">
            <div className="error-icon">⚠️</div>
            <div className="error-details">
              <strong>Connection Error:</strong> {taskLoadError}. Please ensure the backend server is running on port 5000.
            </div>
            <button
              className="btn-retry"
              onClick={() => {
                checkHealth();
                fetchTasksAndStats();
              }}
            >
              Retry Connection
            </button>
          </div>
        )}

        {loadingTasks && tasks.length === 0 && !taskLoadError ? (
          <div className="dashboard-loading-state">
            <div className="loading-spinner"></div>
            <p>Loading study tasks and analytics...</p>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="overview-grid">
                {/* Left column: Study Progress & Tasks */}
                <div className="content-col left-col">
                  <StudyProgress
                    stats={taskStats}
                    sampleProgress={dashboardData?.studyProgress}
                  />
                  <TaskCardList
                    tasks={tasks}
                    filter={taskFilter}
                    onFilterChange={setTaskFilter}
                    onToggleStatus={handleToggleStatus}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteTask}
                    onOpenCreate={handleOpenCreate}
                  />
                </div>

                {/* Right column: Deadlines & Companion Chat */}
                <div className="content-col right-col">
                  <UpcomingDeadlines tasks={tasks} />
                  <ChatPanel tasks={tasks} />
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="tasks-dedicated-view">
                <TaskCardList
                  tasks={tasks}
                  filter={taskFilter}
                  onFilterChange={setTaskFilter}
                  onToggleStatus={handleToggleStatus}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteTask}
                  onOpenCreate={handleOpenCreate}
                />
                <UpcomingDeadlines tasks={tasks} />
              </div>
            )}

            {activeTab === "chat" && (
              <div className="chat-dedicated-view">
                <ChatPanel tasks={tasks} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Task Create / Edit Modal Form */}
      {showTaskForm && (
        <TaskForm
          taskToEdit={taskToEdit}
          onSave={handleSaveTask}
          onCancel={handleCloseForm}
          isSaving={isSavingTask}
          serverErrors={formServerErrors}
        />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <span>StudyPilot • Solo 2nd-Year BTech CSE Project • Alexa+ Track</span>
          <div className="footer-links">
            <span className="footer-pill">Tasks: /api/tasks (JSON file stored)</span>
            <span className="footer-pill">API Proxy: /api ➔ :5000</span>
            <span className="footer-pill">Frontend: Vite :5173</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
