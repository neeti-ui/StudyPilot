import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import http from "http";
import express from "express";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { TaskService, ValidationError, NotFoundError } from "../src/services/taskService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.join(__dirname, ".test_data_" + crypto.randomUUID());
const TEST_TASKS_FILE = path.join(TEST_DIR, "tasks.json");

// Helper to create test express app using a custom TaskService
function createTestApp(service) {
  const app = express();
  app.use(express.json());

  // Mount test router
  app.get("/api/tasks/stats", async (req, res) => {
    try {
      const stats = await service.getStats();
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await service.getAllTasks(req.query.status);
      res.json(tasks);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await service.getTaskById(req.params.id);
      res.json(task);
    } catch (e) {
      if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const created = await service.createTask(req.body);
      res.status(201).json(created);
    } catch (e) {
      if (e instanceof ValidationError) return res.status(400).json({ error: e.message, fields: e.fields });
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const updated = await service.updateTask(req.params.id, req.body);
      res.json(updated);
    } catch (e) {
      if (e instanceof ValidationError) return res.status(400).json({ error: e.message, fields: e.fields });
      if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const deleted = await service.deleteTask(req.params.id);
      res.json({ message: "Task deleted", task: deleted });
    } catch (e) {
      if (e instanceof NotFoundError) return res.status(404).json({ error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}

describe("Task Management API & Service Tests", () => {
  let server;
  let baseUrl;
  let testService;

  before(async () => {
    if (!fs.existsSync(TEST_DIR)) {
      await fs.promises.mkdir(TEST_DIR, { recursive: true });
    }
    testService = new TaskService(TEST_TASKS_FILE);
    const app = createTestApp(testService);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (fs.existsSync(TEST_DIR)) {
      await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  test("Missing file initialization: returns empty array on first read", async () => {
    const res = await fetch(`${baseUrl}/api/tasks`);
    assert.equal(res.status, 200);
    const tasks = await res.json();
    assert.deepEqual(tasks, []);
    assert.ok(fs.existsSync(TEST_TASKS_FILE));
  });

  let createdTaskId;

  test("Create task: creates and returns valid task with generated id and timestamps", async () => {
    const payload = {
      title: "Study Operating Systems Virtual Memory",
      subject: "Operating Systems",
      dueDate: "2026-10-25",
      estimatedMinutes: 90,
      priority: "high"
    };

    const res = await fetch(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id);
    assert.equal(body.title, payload.title);
    assert.equal(body.subject, payload.subject);
    assert.equal(body.dueDate, "2026-10-25");
    assert.equal(body.estimatedMinutes, 90);
    assert.equal(body.priority, "high");
    assert.equal(body.status, "todo");
    assert.ok(body.createdAt);
    assert.ok(body.updatedAt);
    assert.equal(body.completedAt, null);

    createdTaskId = body.id;
  });

  test("List tasks: includes the newly created task", async () => {
    const res = await fetch(`${baseUrl}/api/tasks`);
    assert.equal(res.status, 200);
    const tasks = await res.json();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].id, createdTaskId);
  });

  test("Filter tasks by status: correctly filters todo and completed", async () => {
    // Add a completed task directly
    const completedTaskPayload = {
      title: "Completed DSA Lab",
      subject: "Data Structures",
      dueDate: "2026-10-18",
      estimatedMinutes: 60,
      priority: "medium",
      status: "completed"
    };

    const createRes = await fetch(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(completedTaskPayload)
    });
    assert.equal(createRes.status, 201);
    const completedTask = await createRes.json();
    assert.ok(completedTask.completedAt);

    // Filter ?status=todo
    const todoRes = await fetch(`${baseUrl}/api/tasks?status=todo`);
    assert.equal(todoRes.status, 200);
    const todoTasks = await todoRes.json();
    assert.equal(todoTasks.length, 1);
    assert.equal(todoTasks[0].id, createdTaskId);

    // Filter ?status=completed
    const compRes = await fetch(`${baseUrl}/api/tasks?status=completed`);
    assert.equal(compRes.status, 200);
    const compTasks = await compRes.json();
    assert.equal(compTasks.length, 1);
    assert.equal(compTasks[0].id, completedTask.id);
  });

  test("Edit task: updates fields and updatedAt timestamp", async () => {
    const updatePayload = {
      title: "Study OS Paging & Segmentation",
      estimatedMinutes: 120,
      priority: "medium"
    };

    const res = await fetch(`${baseUrl}/api/tasks/${createdTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload)
    });

    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.title, "Study OS Paging & Segmentation");
    assert.equal(updated.estimatedMinutes, 120);
    assert.equal(updated.priority, "medium");
    assert.equal(updated.subject, "Operating Systems"); // unchanged
  });

  test("Complete task: toggling status to completed sets completedAt timestamp", async () => {
    const res = await fetch(`${baseUrl}/api/tasks/${createdTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" })
    });

    assert.equal(res.status, 200);
    const completed = await res.json();
    assert.equal(completed.status, "completed");
    assert.ok(completed.completedAt);

    // Toggle back to todo sets completedAt to null
    const uncompleteRes = await fetch(`${baseUrl}/api/tasks/${createdTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "todo" })
    });
    assert.equal(uncompleteRes.status, 200);
    const uncompleted = await uncompleteRes.json();
    assert.equal(uncompleted.status, "todo");
    assert.equal(uncompleted.completedAt, null);
  });

  test("Stats endpoint: returns accurate task metrics", async () => {
    const res = await fetch(`${baseUrl}/api/tasks/stats`);
    assert.equal(res.status, 200);
    const stats = await res.json();
    assert.equal(stats.total, 2);
    assert.equal(stats.completed, 1);
    assert.equal(stats.remaining, 1);
    assert.equal(stats.completionPercentage, 50);
    assert.equal(typeof stats.overdueCount, "number");
    assert.equal(typeof stats.dueSoonCount, "number");
    assert.equal(stats.totalEstimatedMinutesRemaining, 120);
  });

  test("Validation: rejects unknown fields", async () => {
    const res = await fetch(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        subject: "Test Subj",
        dueDate: "2026-10-25",
        estimatedMinutes: 30,
        priority: "low",
        hackField: "disallowed"
      })
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.error, "Validation failed");
    assert.ok(data.fields.hackField);
  });

  test("Validation: enforces title and subject bounds, calendar date, priority set, and minutes limits", async () => {
    const invalidPayloads = [
      {
        body: { title: "", subject: "Subj", dueDate: "2026-10-25", estimatedMinutes: 30, priority: "low" },
        field: "title"
      },
      {
        body: { title: "A".repeat(101), subject: "Subj", dueDate: "2026-10-25", estimatedMinutes: 30, priority: "low" },
        field: "title"
      },
      {
        body: { title: "Title", subject: "", dueDate: "2026-10-25", estimatedMinutes: 30, priority: "low" },
        field: "subject"
      },
      {
        body: { title: "Title", subject: "S".repeat(51), dueDate: "2026-10-25", estimatedMinutes: 30, priority: "low" },
        field: "subject"
      },
      {
        // Non-existent calendar date (Feb 30th)
        body: { title: "Title", subject: "Subj", dueDate: "2026-02-30", estimatedMinutes: 30, priority: "low" },
        field: "dueDate"
      },
      {
        // Estimated minutes out of 5..1440 range
        body: { title: "Title", subject: "Subj", dueDate: "2026-10-25", estimatedMinutes: 4, priority: "low" },
        field: "estimatedMinutes"
      },
      {
        // Invalid priority
        body: { title: "Title", subject: "Subj", dueDate: "2026-10-25", estimatedMinutes: 60, priority: "critical" },
        field: "priority"
      }
    ];

    for (const testCase of invalidPayloads) {
      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testCase.body)
      });
      assert.equal(res.status, 400, `Failed for field: ${testCase.field}`);
      const err = await res.json();
      assert.ok(err.fields[testCase.field], `Expected field error for ${testCase.field}`);
    }
  });

  test("Unknown id: returns 404 for GET, PATCH, and DELETE", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";

    const getRes = await fetch(`${baseUrl}/api/tasks/${fakeId}`);
    assert.equal(getRes.status, 404);

    const patchRes = await fetch(`${baseUrl}/api/tasks/${fakeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" })
    });
    assert.equal(patchRes.status, 404);

    const delRes = await fetch(`${baseUrl}/api/tasks/${fakeId}`, {
      method: "DELETE"
    });
    assert.equal(delRes.status, 404);
  });

  test("Delete task: deletes task and removes it from list", async () => {
    const res = await fetch(`${baseUrl}/api/tasks/${createdTaskId}`, {
      method: "DELETE"
    });
    assert.equal(res.status, 200);

    const getRes = await fetch(`${baseUrl}/api/tasks/${createdTaskId}`);
    assert.equal(getRes.status, 404);
  });

  test("Corrupt file recovery: backs up corrupted JSON and reinitializes with []", async () => {
    const corruptDir = path.join(TEST_DIR, "corrupt_test");
    await fs.promises.mkdir(corruptDir, { recursive: true });
    const corruptFile = path.join(corruptDir, "tasks.json");

    // Write completely invalid JSON
    await fs.promises.writeFile(corruptFile, "{ NOT VALID JSON [[[", "utf8");

    const corruptService = new TaskService(corruptFile);
    const tasks = await corruptService.getAllTasks();

    // Should return []
    assert.deepEqual(tasks, []);

    // Check that backup file tasks.corrupt-<timestamp>.json exists
    const files = await fs.promises.readdir(corruptDir);
    const hasCorruptBackup = files.some((f) => f.startsWith("tasks.corrupt-") && f.endsWith(".json"));
    assert.ok(hasCorruptBackup, "Corrupt backup file was created");
  });
});
