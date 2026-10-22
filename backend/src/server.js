import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRouter from "./routes/health.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import tasksRouter from "./routes/tasks.js";
import aiRouter from "./routes/ai.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Routes
app.use("/api/health", healthRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/ai", aiRouter);



// 404 handler for undefined API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `API endpoint '${req.originalUrl}' does not exist on StudyPilot backend.`
  });
});

// Root route notice
app.get("/", (req, res) => {
  res.json({
    name: "StudyPilot API Backend",
    version: "0.1.0",
    healthCheck: "/api/health",
    dashboardSample: "/api/dashboard"
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred."
  });
});

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  StudyPilot Backend Running`);
  console.log(`  Port: http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`  Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`  Tasks: http://localhost:${PORT}/api/tasks`);
  console.log(`  Task Stats: http://localhost:${PORT}/api/tasks/stats`);
  console.log(`  AI Status: http://localhost:${PORT}/api/ai/status`);
  console.log(`  AI Chat: http://localhost:${PORT}/api/ai/chat`);
  console.log(`  AI Study Plan: http://localhost:${PORT}/api/ai/study-plan`);
  console.log(`=========================================`);
});

export default app;
