import React from "react";
import SampleDataBadge from "./SampleDataBadge";

export default function StudyProgress({ stats = {}, sampleProgress = null }) {
  const total = stats.total ?? 0;
  const completed = stats.completed ?? 0;
  const remaining = stats.remaining ?? 0;
  const completionPercentage = stats.completionPercentage ?? (total === 0 ? 0 : Math.round((completed / total) * 100));
  const totalMins = stats.totalEstimatedMinutesRemaining ?? 0;

  // Convert minutes into human readable hours & mins
  const hoursLeft = Math.floor(totalMins / 60);
  const minsLeft = totalMins % 60;
  const timeFormatted =
    hoursLeft > 0 ? `${hoursLeft}h ${minsLeft > 0 ? `${minsLeft}m` : ""}` : `${minsLeft}m`;

  const overdueCount = stats.overdueCount ?? 0;
  const dueSoonCount = stats.dueSoonCount ?? 0;

  return (
    <div className="dashboard-card progress-section">
      <div className="card-header">
        <div className="card-title-group">
          <h3>Task & Study Progress</h3>
          {overdueCount > 0 && (
            <span className="overdue-alert-pill">⚠️ {overdueCount} Overdue</span>
          )}
          {dueSoonCount > 0 && (
            <span className="due-soon-alert-pill">⚡ {dueSoonCount} Due Soon</span>
          )}
        </div>
      </div>

      {/* Real Task Progress Metrics (No sample badge!) */}
      <div className="progress-metrics-row">
        <div className="metric-box">
          <span className="metric-label">Completed Tasks</span>
          <div className="metric-val-group">
            <span className="metric-val">{completed}</span>
            <span className="metric-unit">/ {total}</span>
          </div>
        </div>

        <div className="metric-box">
          <span className="metric-label">Remaining Time</span>
          <div className="metric-val-group">
            <span className="metric-val">{total === 0 ? "0m" : timeFormatted}</span>
            <span className="metric-unit">({remaining} tasks)</span>
          </div>
        </div>

        <div className="metric-box">
          <span className="metric-label">Completion Rate</span>
          <div className="metric-val-group">
            <span className="metric-val">{completionPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Main Real Progress Bar */}
      <div className="main-progress-bar-container">
        <div className="progress-bar-labels">
          <span>Task Completion Progress</span>
          <span>{completed} of {total} completed ({completionPercentage}%)</span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Mock Subject Time Allocation (labelled with Sample Badge) */}
      {sampleProgress?.subjectBreakdown && (
        <div className="subject-breakdown-area">
          <div className="breakdown-header">
            <h4>Target Subject Allocation</h4>
            <SampleDataBadge text="Sample breakdown" size="small" />
          </div>
          <div className="subject-bars">
            {sampleProgress.subjectBreakdown.map((subj, idx) => {
              const subjPercent = Math.min(
                100,
                Math.round((subj.hoursSpent / subj.targetHours) * 100)
              );
              return (
                <div key={idx} className="subject-bar-row">
                  <div className="subject-bar-info">
                    <span className="subject-name">{subj.subject}</span>
                    <span className="subject-hours">
                      {subj.hoursSpent}h / {subj.targetHours}h
                    </span>
                  </div>
                  <div className="subject-track">
                    <div
                      className="subject-fill"
                      style={{ width: `${subjPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
