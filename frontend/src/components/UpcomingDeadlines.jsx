import React from "react";

// Helper: get local calendar date string YYYY-MM-DD
function getLocalTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: format future local calendar date
function getLocalFutureDateString(daysAhead = 3) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function UpcomingDeadlines({ tasks = [] }) {
  const localToday = getLocalTodayDateString();
  const dueSoonThreshold = getLocalFutureDateString(3);

  // Incomplete tasks sorted by dueDate ascending (soonest first)
  const incompleteDeadlines = tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="dashboard-card deadlines-section">
      <div className="card-header">
        <div className="card-title-group">
          <h3>Upcoming Deadlines</h3>
          <span className="count-badge">{incompleteDeadlines.length} scheduled</span>
        </div>
      </div>

      <div className="deadlines-list">
        {incompleteDeadlines.length === 0 ? (
          <div className="empty-deadlines-note">
            <span>🎉 No pending deadlines! All your study tasks are complete.</span>
          </div>
        ) : (
          incompleteDeadlines.map((task) => {
            const isOverdue = task.dueDate < localToday;
            const isDueToday = task.dueDate === localToday;
            const isApproaching = !isOverdue && !isDueToday && task.dueDate <= dueSoonThreshold;

            let urgencyClass = "normal";
            let urgencyLabel = "Upcoming";

            if (isOverdue) {
              urgencyClass = "urgent";
              urgencyLabel = "Overdue";
            } else if (isDueToday) {
              urgencyClass = "urgent";
              urgencyLabel = "Due Today";
            } else if (isApproaching) {
              urgencyClass = "approaching";
              urgencyLabel = "Due Soon";
            }

            // Split date components safely
            const dateParts = task.dueDate.split("-");
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthIndex = parseInt(dateParts[1], 10) - 1;
            const monthStr = monthNames[monthIndex] || dateParts[1];
            const dayStr = dateParts[2];

            return (
              <div key={task.id} className={`deadline-item urgency-${urgencyClass}`}>
                <div className="deadline-date-box">
                  <span className="date-badge-date">{monthStr}</span>
                  <span className="date-badge-day">{dayStr}</span>
                </div>

                <div className="deadline-info">
                  <div className="deadline-title-line">
                    <span className="deadline-title">{task.title}</span>
                    <span className={`urgency-pill pill-${urgencyClass}`}>
                      {urgencyLabel}
                    </span>
                  </div>
                  <div className="deadline-sub-line">
                    <span className="course-code">{task.subject}</span>
                    <span className="deadline-time">• Est: ~{task.estimatedMinutes}m</span>
                  </div>
                </div>

                <span className={`priority-tag priority-${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
