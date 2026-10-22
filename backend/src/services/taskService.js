import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.resolve(__dirname, "../../data");
const DEFAULT_TASKS_FILE = path.join(DEFAULT_DATA_DIR, "tasks.json");

/**
 * Custom Error for validation failures.
 */
export class ValidationError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.fields = fields;
  }
}

/**
 * Custom Error for resources not found.
 */
export class NotFoundError extends Error {
  constructor(message = "Task not found") {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

/**
 * Simple Promise serialization queue to ensure sequential atomic file operations.
 */
class SerializedQueue {
  constructor() {
    this._queue = Promise.resolve();
  }

  run(taskFn) {
    const nextPromise = this._queue.then(() => taskFn());
    // Keep the queue chain alive even if a task rejects
    this._queue = nextPromise.catch(() => {});
    return nextPromise;
  }
}

/**
 * Helper: format local calendar date as YYYY-MM-DD
 */
export function getLocalTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Helper: format future local calendar date as YYYY-MM-DD
 */
export function getLocalFutureDateString(daysAhead = 3) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Helper: validate that date string is a real calendar date in YYYY-MM-DD format.
 */
export function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;

  return true;
}

/**
 * Helper: check if a record matches the minimal valid shape of a task.
 */
function isValidTaskRecord(record) {
  return (
    record &&
    typeof record === "object" &&
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.subject === "string" &&
    isValidCalendarDate(record.dueDate) &&
    typeof record.estimatedMinutes === "number" &&
    ["low", "medium", "high"].includes(record.priority) &&
    ["todo", "completed"].includes(record.status)
  );
}

/**
 * TaskService: Handles all task business logic and atomic file storage.
 * Free of Express dependencies for reusability.
 */
export class TaskService {
  constructor(filePath = DEFAULT_TASKS_FILE) {
    this.filePath = filePath;
    this.dataDir = path.dirname(filePath);
    this.queue = new SerializedQueue();
  }

  /**
   * Reads tasks from the JSON file, handling missing file, invalid JSON, and corrupt data.
   */
  async _readTasks() {
    // Ensure parent data directory exists
    if (!fs.existsSync(this.dataDir)) {
      await fs.promises.mkdir(this.dataDir, { recursive: true });
    }

    // Missing file: initialize with []
    if (!fs.existsSync(this.filePath)) {
      await this._atomicWriteDirect([]);
      return [];
    }

    let rawData;
    try {
      rawData = await fs.promises.readFile(this.filePath, "utf8");
    } catch (err) {
      console.warn(`[TaskService] Warning: Failed to read file ${this.filePath}:`, err.message);
      return [];
    }

    // Handle empty file
    if (!rawData.trim()) {
      await this._atomicWriteDirect([]);
      return [];
    }

    let parsed;
    try {
      parsed = JSON.parse(rawData);
    } catch (err) {
      console.warn(`[TaskService] Warning: Invalid JSON in ${this.filePath}. Initiating recovery.`);
      await this._recoverCorruptFile();
      return [];
    }

    // Wrong shape (not an array)
    if (!Array.isArray(parsed)) {
      console.warn(`[TaskService] Warning: File ${this.filePath} did not contain a JSON array. Initiating recovery.`);
      await this._recoverCorruptFile();
      return [];
    }

    // Validate individual records, dropping malformed entries
    const validRecords = [];
    let droppedCount = 0;

    for (const item of parsed) {
      if (isValidTaskRecord(item)) {
        validRecords.push(item);
      } else {
        droppedCount++;
        console.warn(`[TaskService] Warning: Dropping malformed task record:`, item);
      }
    }

    if (droppedCount > 0) {
      console.warn(`[TaskService] Dropped ${droppedCount} malformed record(s). Resaving valid tasks.`);
      await this._atomicWriteDirect(validRecords);
    }

    return validRecords;
  }

  /**
   * Backs up corrupt file to tasks.corrupt-<timestamp>.json and resets tasks.json to []
   */
  async _recoverCorruptFile() {
    try {
      const timestamp = Date.now();
      const corruptFileName = `tasks.corrupt-${timestamp}.json`;
      const corruptFilePath = path.join(this.dataDir, corruptFileName);

      if (fs.existsSync(this.filePath)) {
        await fs.promises.copyFile(this.filePath, corruptFilePath);
        console.warn(`[TaskService] Preserved corrupt tasks file at: ${corruptFilePath}`);
      }
      await this._atomicWriteDirect([]);
    } catch (err) {
      console.error(`[TaskService] Error while handling corrupt file:`, err);
    }
  }

  /**
   * Atomic file write: write to temp file then rename.
   */
  async _atomicWriteDirect(tasks) {
    if (!fs.existsSync(this.dataDir)) {
      await fs.promises.mkdir(this.dataDir, { recursive: true });
    }

    const tempFilePath = path.join(this.dataDir, `.tasks.tmp.${crypto.randomUUID()}`);
    const jsonContent = JSON.stringify(tasks, null, 2);

    try {
      await fs.promises.writeFile(tempFilePath, jsonContent, "utf8");
      await fs.promises.rename(tempFilePath, this.filePath);
    } catch (err) {
      if (fs.existsSync(tempFilePath)) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch (_) {}
      }
      throw err;
    }
  }

  /**
   * Writes tasks atomically via the serialized queue.
   */
  async _writeTasks(tasks) {
    return this.queue.run(async () => {
      await this._atomicWriteDirect(tasks);
    });
  }

  /**
   * Validates input payload for creating or updating a task.
   * Rejects unknown fields.
   */
  _validateTaskPayload(data, isUpdate = false) {
    const allowedKeys = ["title", "subject", "dueDate", "estimatedMinutes", "priority", "status"];
    const fields = {};

    // Reject unknown fields
    for (const key of Object.keys(data)) {
      if (!allowedKeys.includes(key)) {
        fields[key] = `Unknown field '${key}' is not permitted.`;
      }
    }

    // Title validation
    if (!isUpdate || data.title !== undefined) {
      if (typeof data.title !== "string") {
        fields.title = "Title must be a text string.";
      } else {
        const trimmed = data.title.trim();
        if (trimmed.length < 1 || trimmed.length > 100) {
          fields.title = "Title must be between 1 and 100 characters.";
        }
      }
    }

    // Subject validation
    if (!isUpdate || data.subject !== undefined) {
      if (typeof data.subject !== "string") {
        fields.subject = "Subject must be a text string.";
      } else {
        const trimmed = data.subject.trim();
        if (trimmed.length < 1 || trimmed.length > 50) {
          fields.subject = "Subject must be between 1 and 50 characters.";
        }
      }
    }

    // DueDate validation (YYYY-MM-DD real calendar date)
    if (!isUpdate || data.dueDate !== undefined) {
      if (!isValidCalendarDate(data.dueDate)) {
        fields.dueDate = "Due date must be a valid calendar date in YYYY-MM-DD format.";
      }
    }

    // EstimatedMinutes validation (integer 5 - 1440)
    if (!isUpdate || data.estimatedMinutes !== undefined) {
      if (
        typeof data.estimatedMinutes !== "number" ||
        !Number.isInteger(data.estimatedMinutes) ||
        data.estimatedMinutes < 5 ||
        data.estimatedMinutes > 1440
      ) {
        fields.estimatedMinutes = "Estimated time must be an integer between 5 and 1440 minutes (24 hours).";
      }
    }

    // Priority validation ("low" | "medium" | "high")
    if (!isUpdate || data.priority !== undefined) {
      const allowedPriorities = ["low", "medium", "high"];
      if (!allowedPriorities.includes(data.priority)) {
        fields.priority = "Priority must be one of: low, medium, high.";
      }
    }

    // Status validation ("todo" | "completed")
    if (data.status !== undefined) {
      const allowedStatuses = ["todo", "completed"];
      if (!allowedStatuses.includes(data.status)) {
        fields.status = "Status must be either 'todo' or 'completed'.";
      }
    }

    if (Object.keys(fields).length > 0) {
      throw new ValidationError("Validation failed", fields);
    }
  }

  /**
   * Retrieves all tasks, optionally filtered by status.
   */
  async getAllTasks(statusFilter) {
    return this.queue.run(async () => {
      const tasks = await this._readTasks();
      if (!statusFilter) return tasks;

      if (statusFilter === "completed") {
        return tasks.filter((t) => t.status === "completed");
      }
      if (statusFilter === "todo" || statusFilter === "active") {
        return tasks.filter((t) => t.status !== "completed");
      }
      return tasks.filter((t) => t.status === statusFilter);
    });
  }

  /**
   * Retrieves a single task by ID.
   */
  async getTaskById(id) {
    return this.queue.run(async () => {
      const tasks = await this._readTasks();
      const task = tasks.find((t) => t.id === id);
      if (!task) {
        throw new NotFoundError(`Task with ID '${id}' not found`);
      }
      return task;
    });
  }

  /**
   * Creates a new task.
   */
  async createTask(data) {
    this._validateTaskPayload(data, false);

    return this.queue.run(async () => {
      const tasks = await this._readTasks();
      const now = new Date().toISOString();

      const newTask = {
        id: crypto.randomUUID(),
        title: data.title.trim(),
        subject: data.subject.trim(),
        dueDate: data.dueDate,
        estimatedMinutes: data.estimatedMinutes,
        priority: data.priority,
        status: data.status || "todo",
        createdAt: now,
        updatedAt: now,
        completedAt: data.status === "completed" ? now : null
      };

      tasks.push(newTask);
      await this._atomicWriteDirect(tasks);
      return newTask;
    });
  }

  /**
   * Updates an existing task by ID.
   */
  async updateTask(id, updateData) {
    this._validateTaskPayload(updateData, true);

    return this.queue.run(async () => {
      const tasks = await this._readTasks();
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new NotFoundError(`Task with ID '${id}' not found`);
      }

      const existing = tasks[index];
      const now = new Date().toISOString();

      let newStatus = existing.status;
      let newCompletedAt = existing.completedAt;

      if (updateData.status !== undefined) {
        newStatus = updateData.status;
        if (newStatus === "completed" && existing.status !== "completed") {
          newCompletedAt = now;
        } else if (newStatus !== "completed" && existing.status === "completed") {
          newCompletedAt = null;
        }
      }

      const updatedTask = {
        ...existing,
        title: updateData.title !== undefined ? updateData.title.trim() : existing.title,
        subject: updateData.subject !== undefined ? updateData.subject.trim() : existing.subject,
        dueDate: updateData.dueDate !== undefined ? updateData.dueDate : existing.dueDate,
        estimatedMinutes:
          updateData.estimatedMinutes !== undefined ? updateData.estimatedMinutes : existing.estimatedMinutes,
        priority: updateData.priority !== undefined ? updateData.priority : existing.priority,
        status: newStatus,
        completedAt: newCompletedAt,
        updatedAt: now
      };

      tasks[index] = updatedTask;
      await this._atomicWriteDirect(tasks);
      return updatedTask;
    });
  }

  /**
   * Deletes a task by ID.
   */
  async deleteTask(id) {
    return this.queue.run(async () => {
      const tasks = await this._readTasks();
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new NotFoundError(`Task with ID '${id}' not found`);
      }

      const [deleted] = tasks.splice(index, 1);
      await this._atomicWriteDirect(tasks);
      return deleted;
    });
  }

  /**
   * Calculates dashboard task statistics using local calendar comparisons.
   */
  async getStats() {
    return this.queue.run(async () => {
      const tasks = await this._readTasks();
      const localToday = getLocalTodayDateString();
      const dueSoonThreshold = getLocalFutureDateString(3);

      const total = tasks.length;
      let completed = 0;
      let remaining = 0;
      let overdueCount = 0;
      let dueSoonCount = 0;
      let totalEstimatedMinutesRemaining = 0;

      for (const t of tasks) {
        if (t.status === "completed") {
          completed++;
        } else {
          remaining++;
          totalEstimatedMinutesRemaining += t.estimatedMinutes || 0;

          // Local calendar date comparison
          if (t.dueDate < localToday) {
            overdueCount++;
          } else if (t.dueDate <= dueSoonThreshold) {
            dueSoonCount++;
          }
        }
      }

      const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        total,
        completed,
        remaining,
        completionPercentage,
        overdueCount,
        dueSoonCount,
        totalEstimatedMinutesRemaining
      };
    });
  }
}

export const taskService = new TaskService();
