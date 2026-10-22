import { Router } from "express";
import { taskService, ValidationError, NotFoundError } from "../services/taskService.js";

const router = Router();

// GET /api/tasks/stats (must precede /:id)
router.get("/stats", async (req, res, next) => {
  try {
    const stats = await taskService.getStats();
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks?status=
router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;
    const tasks = await taskService.getAllTasks(status);
    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get("/:id", async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    res.status(200).json(task);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/tasks
router.post("/", async (req, res, next) => {
  try {
    const created = await taskService.createTask(req.body);
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message, fields: err.fields });
    }
    next(err);
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const updated = await taskService.updateTask(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message, fields: err.fields });
    }
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await taskService.deleteTask(req.params.id);
    res.status(200).json({ message: "Task deleted successfully", task: deleted });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
