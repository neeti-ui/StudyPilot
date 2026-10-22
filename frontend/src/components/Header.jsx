import React from "react";
import SampleDataBadge from "./SampleDataBadge";

export default function Header({ backendStatus, student, activeTab, setActiveTab }) {
  return (
    <header className="header-container">
      <div className="header-left">
        <div className="logo-group">
          <div className="logo-icon">SP</div>
          <div className="logo-text">
            <span className="logo-title">StudyPilot</span>
            <span className="logo-subtitle">Alexa+ Hackathon 2026</span>
          </div>
        </div>
        <span className="phase-pill">Foundation Phase</span>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Dashboard
        </button>
        <button
          className={`nav-btn ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => setActiveTab("tasks")}
        >
          Tasks
        </button>
        <button
          className={`nav-btn ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          AI Chat
        </button>
      </nav>

      <div className="header-right">
        {/* Backend health status pill */}
        <div className={`status-indicator ${backendStatus.healthy ? "online" : "checking"}`}>
          <span className="status-dot"></span>
          <span className="status-label">
            {backendStatus.healthy ? "Backend: Online (Port 5000)" : "Backend: Connecting..."}
          </span>
        </div>

        {/* Student Profile block (clearly labelled sample data) */}
        <div className="student-pill" title="Sample student account">
          <div className="avatar-circle">AS</div>
          <div className="student-info">
            <div className="student-name">
              <span>{student?.name || "Alex Sharma"}</span>
              <SampleDataBadge text="Sample" size="small" />
            </div>
            <span className="student-detail">{student?.program || "2nd Yr B.Tech CSE"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
