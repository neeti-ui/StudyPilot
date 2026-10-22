import React, { useState, useEffect } from "react";

export default function TaskForm({
  taskToEdit = null,
  onSave,
  onCancel,
  isSaving = false,
  serverErrors = {}
}) {
  const isEditing = Boolean(taskToEdit);

  // Form field state
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [priority, setPriority] = useState("medium");

  // Client-side validation errors
  const [clientErrors, setClientErrors] = useState({});

  // Helper to format local date YYYY-MM-DD
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Pre-fill when editing or reset for create
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || "");
      setSubject(taskToEdit.subject || "");
      setDueDate(taskToEdit.dueDate || "");
      setEstimatedMinutes(taskToEdit.estimatedMinutes || 60);
      setPriority(taskToEdit.priority || "medium");
    } else {
      setTitle("");
      setSubject("");
      setDueDate(getTodayDateStr());
      setEstimatedMinutes(60);
      setPriority("medium");
    }
    setClientErrors({});
  }, [taskToEdit]);

  // Combined field errors (server errors take precedence if present)
  const getFieldError = (fieldName) => {
    return serverErrors[fieldName] || clientErrors[fieldName] || null;
  };

  const validate = () => {
    const errors = {};
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errors.title = "Task title is required.";
    } else if (trimmedTitle.length > 100) {
      errors.title = "Title must not exceed 100 characters.";
    }

    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      errors.subject = "Subject or course name is required.";
    } else if (trimmedSubject.length > 50) {
      errors.subject = "Subject must not exceed 50 characters.";
    }

    if (!dueDate) {
      errors.dueDate = "Due date is required.";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      errors.dueDate = "Date must be in YYYY-MM-DD format.";
    }

    const mins = Number(estimatedMinutes);
    if (!Number.isInteger(mins) || mins < 5 || mins > 1440) {
      errors.estimatedMinutes = "Estimated time must be between 5 and 1440 minutes (24h).";
    }

    if (!["low", "medium", "high"].includes(priority)) {
      errors.priority = "Priority must be low, medium, or high.";
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      title: title.trim(),
      subject: subject.trim(),
      dueDate,
      estimatedMinutes: Number(estimatedMinutes),
      priority
    };

    const success = await onSave(payload, taskToEdit?.id);
    if (success && !isEditing) {
      // Reset form on successful creation
      setTitle("");
      setSubject("");
      setDueDate(getTodayDateStr());
      setEstimatedMinutes(60);
      setPriority("medium");
      setClientErrors({});
    }
  };

  return (
    <div className="task-form-overlay">
      <div className="task-form-modal">
        <div className="task-form-header">
          <h3>{isEditing ? "Edit Study Task" : "Create New Study Task"}</h3>
          <button
            type="button"
            className="form-close-x"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form-body">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="task-title">
              Task Title <span className="required-star">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              className={`form-input ${getFieldError("title") ? "has-error" : ""}`}
              placeholder="e.g. Implement Dijkstra's Algorithm in C++"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
            />
            <div className="field-hint-row">
              <span className="field-char-count">{title.length}/100</span>
              {getFieldError("title") && (
                <span className="field-error-msg">{getFieldError("title")}</span>
              )}
            </div>
          </div>

          {/* Subject */}
          <div className="form-group">
            <label htmlFor="task-subject">
              Subject / Course <span className="required-star">*</span>
            </label>
            <input
              id="task-subject"
              type="text"
              className={`form-input ${getFieldError("subject") ? "has-error" : ""}`}
              placeholder="e.g. Data Structures & Algorithms, Operating Systems"
              value={subject}
              maxLength={50}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSaving}
            />
            <div className="field-hint-row">
              <span className="field-char-count">{subject.length}/50</span>
              {getFieldError("subject") && (
                <span className="field-error-msg">{getFieldError("subject")}</span>
              )}
            </div>
          </div>

          {/* Due Date & Estimated Minutes Row */}
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="task-due-date">
                Due Date <span className="required-star">*</span>
              </label>
              <input
                id="task-due-date"
                type="date"
                className={`form-input ${getFieldError("dueDate") ? "has-error" : ""}`}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isSaving}
              />
              {getFieldError("dueDate") && (
                <span className="field-error-msg">{getFieldError("dueDate")}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="task-est-mins">
                Estimated Time (mins) <span className="required-star">*</span>
              </label>
              <input
                id="task-est-mins"
                type="number"
                min={5}
                max={1440}
                step={5}
                className={`form-input ${getFieldError("estimatedMinutes") ? "has-error" : ""}`}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                disabled={isSaving}
              />
              {getFieldError("estimatedMinutes") && (
                <span className="field-error-msg">{getFieldError("estimatedMinutes")}</span>
              )}
            </div>
          </div>

          {/* Priority */}
          <div className="form-group">
            <label htmlFor="task-priority">
              Priority <span className="required-star">*</span>
            </label>
            <select
              id="task-priority"
              className={`form-select ${getFieldError("priority") ? "has-error" : ""}`}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={isSaving}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority (Urgent)</option>
            </select>
            {getFieldError("priority") && (
              <span className="field-error-msg">{getFieldError("priority")}</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
