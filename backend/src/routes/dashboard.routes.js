import { Router } from "express";
import { dashboardService } from "../services/dashboard.service.js";

const router = Router();

// GET /api/dashboard - Returns complete dashboard sample data
router.get("/", async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardOverview();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/tasks
router.get("/tasks", async (req, res, next) => {
  try {
    const tasks = await dashboardService.getTasks();
    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/deadlines
router.get("/deadlines", async (req, res, next) => {
  try {
    const deadlines = await dashboardService.getUpcomingDeadlines();
    res.status(200).json(deadlines);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/progress
router.get("/progress", async (req, res, next) => {
  try {
    const progress = await dashboardService.getStudyProgress();
    res.status(200).json(progress);
  } catch (err) {
    next(err);
  }
});

export default router;
