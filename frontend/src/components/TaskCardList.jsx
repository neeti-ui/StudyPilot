import React, { useState } from "react";

// Helper: get local calendar date string YYYY-MM-DD
function getLocalTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TaskCardList({
  tasks = [],
  filter = "all",
  onFilterChange,
  onToggleStatus,
  onEdit,
  onDelete,
  onOpenCreate
}) {
  const [taskPendingDelete, setTaskPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const localToday = getLocalTodayDateString();

  // Counts
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status !== "completed").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.status === "completed";
    if (filter === "todo" || filter === "active") return task.status !== "completed";
    return true;
  });

  const confirmDelete = async () => {
    if (!taskPendingDelete) return;
    setIsDeleting(true);
    await onDelete(taskPendingDelete.id);
    setIsDeleting(false);
    setTaskPendingDelete(null);
  };

  return (
    <div className="dashboard-card task-card-section">
      <div className="card-header">
        <div className="card-title-group">
          <h3>Study Tasks</h3>
          <span className="count-badge">{totalCount} total</span>
        </div>
        <button
          className="btn-create-task"
          onClick={onOpenCreate}
          aria-label="Add new task"
        >
          <span className="btn-icon">+</span> Add Task
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="task-filter-bar">
        <button
          className={`filter-chip ${filter === "all" ? "active" : ""}`}
          onClick={() => onFilterChange("all")}
        >
          All ({totalCount})
        </button>
        <button
          className={`filter-chip ${filter === "todo" ? "active" : ""}`}
          onClick={() => onFilterChange("todo")}
        >
          In Progress / Todo ({todoCount})
        </button>
        <button
          className={`filter-chip ${filter === "completed" ? "active" : ""}`}
          onClick={() => onFilterChange("completed")}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Task List */}
      <div className="task-list">
        {filteredTasks.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">
              {filter === "all" && "No study tasks yet"}
              {filter === "todo" && "All caught up! 🎉"}
              {filter === "completed" && "No completed tasks yet"}
            </div>
            <div className="empty-state-text">
              {filter === "all" && "Get started by adding your first study task above."}
              {filter === "todo" && "No pending tasks remain in your queue. Take a well-deserved break or add a new goal!"}
              {filter === "completed" && "Mark tasks as completed by checking them off when done."}
            </div>
            {filter === "all" && (
              <button className="btn-primary-sm" onClick={onOpenCreate}>
                + Create Task
              </button>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const isOverdue = !isCompleted && task.dueDate < localToday;
            const isDueToday = !isCompleted && task.dueDate === localToday;

            return (
              <div
                key={task.id}
                className={`task-item ${isCompleted ? "task-completed" : ""} ${
                  isOverdue ? "task-overdue-border" : ""
                }`}
              >
                <div className="task-left">
                  <input
                    type="checkbox"
                    className="task-checkbox"
                    checked={isCompleted}
                    onChange={() => onToggleStatus(task.id, task.status)}
                    aria-label={`Mark task '${task.title}' as ${isCompleted ? "incomplete" : "complete"}`}
                  />
                  <div className="task-text-group">
                    <div className="task-title-line">
                      <span className="task-title">{task.title}</span>
                      {isOverdue && (
                        <span className="overdue-tag" title="Past due date!">
                          ⚠️ Overdue
                        </span>
                      )}
                      {isDueToday && (
                        <span className="due-today-tag" title="Due today!">
                          ⚡ Due Today
                        </span>
                      )}
                    </div>
                    <div className="task-meta">
                      <span className="task-subject">{task.subject}</span>
                      <span className="task-due">
                        • Due: <strong>{task.dueDate}</strong>
                      </span>
                      <span className="task-est">• ~{task.estimatedMinutes} mins</span>
                      {isCompleted && task.completedAt && (
                        <span className="task-completed-time">
                          • Done on {task.completedAt.split("T")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="task-right">
                  <span className={`priority-tag priority-${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                  <div className="task-action-btns">
                    <button
                      className="btn-action btn-edit"
                      onClick={() => onEdit(task)}
                      title="Edit task"
                      aria-label={`Edit ${task.title}`}
                    >
                      ✎
                    </button>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => setTaskPendingDelete(task)}
                      title="Delete task"
                      aria-label={`Delete ${task.title}`}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {taskPendingDelete && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-card">
            <h4>Delete Task?</h4>
            <p className="confirm-modal-desc">
              Are you sure you want to delete{" "}
              <strong>"{taskPendingDelete.title}"</strong>? This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setTaskPendingDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
