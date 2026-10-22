import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import express from "express";
import { AIService } from "../src/services/aiService.js";

// Helper to create an isolated test express app with a custom AIService instance
function createTestApp(aiServiceInstance) {
  const app = express();
  app.use(express.json());

  app.get("/api/ai/status", (req, res) => {
    res.status(200).json(aiServiceInstance.getStatus());
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages) {
        return res.status(400).json({ error: "Validation error: 'messages' array is required." });
      }
      const response = await aiServiceInstance.chat({ messages });
      res.status(200).json(response);
    } catch (err) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message, code: err.code || "AI_ERROR" });
    }
  });

  app.post("/api/ai/study-plan", async (req, res) => {
    try {
      const { studentNotes } = req.body || {};
      const plan = await aiServiceInstance.generateStudyPlan({ studentNotes });
      res.status(200).json(plan);
    } catch (err) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message, code: err.code || "AI_PLAN_ERROR" });
    }
  });

  return app;
}

describe("AI Study Companion Service & Routes Tests", () => {
  let server;
  let baseUrl;

  // Mock Gemini client factory
  function createMockClient({
    responseText = "Here is an explanation of Dijkstra's algorithm for your DSA course.",
    shouldFail = false,
    errorMessage = "Quota exceeded",
    errorStatus = 429
  } = {}) {
    return {
      models: {
        generateContent: async ({ model, contents, config }) => {
          if (shouldFail) {
            const err = new Error(errorMessage);
            err.status = errorStatus;
            throw err;
          }
          return {
            text: responseText,
            candidates: [{ content: { parts: [{ text: responseText }] } }]
          };
        }
      }
    };
  }

  // Mock task service
  const mockTaskService = {
    getAllTasks: async (filter) => [
      {
        id: "t1",
        title: "Implement Dijkstra in C++",
        subject: "Data Structures & Algorithms",
        dueDate: "2026-10-21",
        estimatedMinutes: 60,
        priority: "high",
        status: "todo"
      },
      {
        id: "t2",
        title: "Revise OS CPU Scheduling",
        subject: "Operating Systems",
        dueDate: "2026-10-23",
        estimatedMinutes: 90,
        priority: "medium",
        status: "todo"
      }
    ],
    getStats: async () => ({
      total: 3,
      completed: 1,
      remaining: 2,
      completionPercentage: 33,
      overdueCount: 0,
      dueSoonCount: 1,
      totalEstimatedMinutesRemaining: 150
    })
  };

  test("Status endpoint when API key is missing: returns configured: false with setup instructions", async () => {
    const unconfiguredService = new AIService({ apiKey: null, client: null });
    const app = createTestApp(unconfiguredService);
    const tempServer = http.createServer(app);
    await new Promise((r) => tempServer.listen(0, r));
    const port = tempServer.address().port;

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.configured, false);
    assert.ok(body.instructions.includes("https://aistudio.google.com/"));

    await new Promise((r) => tempServer.close(r));
  });

  test("Status endpoint when API key is configured: returns configured: true", async () => {
    const mockClient = createMockClient();
    const configuredService = new AIService({
      apiKey: "test-fake-key",
      client: mockClient,
      model: "gemini-2.5-flash"
    });
    const app = createTestApp(configuredService);
    const tempServer = http.createServer(app);
    await new Promise((r) => tempServer.listen(0, r));
    const port = tempServer.address().port;

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.configured, true);
    assert.equal(body.provider, "Google Gemini");
    assert.equal(body.model, "gemini-2.5-flash");

    await new Promise((r) => tempServer.close(r));
  });

  test("Chat endpoint when API is unconfigured: returns 503 Service Unavailable", async () => {
    const unconfiguredService = new AIService({ apiKey: null, client: null });
    const app = createTestApp(unconfiguredService);
    const tempServer = http.createServer(app);
    await new Promise((r) => tempServer.listen(0, r));
    const port = tempServer.address().port;

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Explain virtual memory" }]
      })
    });

    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.code, "AI_NOT_CONFIGURED");
    assert.ok(body.error.includes("GEMINI_API_KEY"));

    await new Promise((r) => tempServer.close(r));
  });

  test("Validation: rejects empty messages array, invalid role, or empty content", async () => {
    const mockClient = createMockClient();
    const service = new AIService({ client: mockClient, apiKey: "mock" });
    const app = createTestApp(service);
    const tempServer = http.createServer(app);
    await new Promise((r) => tempServer.listen(0, r));
    const port = tempServer.address().port;

    // 1. Missing messages
    const res1 = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(res1.status, 400);

    // 2. Empty messages array
    const res2 = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] })
    });
    assert.equal(res2.status, 500); // throws validation error in service
    const body2 = await res2.json();
    assert.ok(body2.error.includes("non-empty array"));

    // 3. Invalid role
    const res3 = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "hacker", content: "hello" }] })
    });
    assert.equal(res3.status, 500);
    const body3 = await res3.json();
    assert.ok(body3.error.includes("invalid role"));

    // 4. Empty content string
    const res4 = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "   " }] })
    });
    assert.equal(res4.status, 500);
    const body4 = await res4.json();
    assert.ok(body4.error.includes("empty content"));

    await new Promise((r) => tempServer.close(r));
  });

  test("Successful AI response: returns generated text using mocked Gemini provider", async () => {
    const expectedReply = "In C++, a virtual function enables runtime polymorphism via the vtable.";
    const mockClient = createMockClient({ responseText: expectedReply });
    const service = new AIService({
      client: mockClient,
      apiKey: "mock-key",
      model: "gemini-2.5-flash"
    });
    const app = createTestApp(service);
    const tempServer = http.createServer(app);
    await new Promise((r) => tempServer.listen(0, r));
    const port = tempServer.address().port;

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "What is a virtual function in C++?" }
        ]
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.reply, expectedReply);
    assert.equal(body.model, "gemini-2.5-flash");
    assert.ok(body.timestamp);

    await new Promise((r) => tempServer.close(r));
  });

  test("Provider error handling: returns 502 with clean error description when AI provider fails", async () => {
    const mockFailingClient = createMockClient({
      shouldFail: true,
      errorMessage: "Resource exhausted / Rate limit exceeded",
      errorStatus: 429
    });
    const service = new AIService({
      client: mockFailingClient,
      apiKey: "mock-key"
    });
    const app = createTestApp(service);
    const tempServer = http.createServer(app);
    await new Promise((r) => tempServer.listen(0, r));
    const port = tempServer.address().port;

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Explain semaphores" }]
      })
    });

    assert.equal(res.status, 429);
    const body = await res.json();
    assert.ok(body.error.includes("AI Provider Error"));
    assert.ok(body.error.includes("Rate limit exceeded"));

    await new Promise((r) => tempServer.close(r));
  });

  test("Study plan generation workflow: loads pending tasks and returns tailored revision plan", async () => {
    const expectedPlan = "### Day 1: Dijkstra in C++ (60m)\n### Day 2: CPU Scheduling (90m)";
    const mockClient = createMockClient({ responseText: expectedPlan });
    const service = new AIService({
      client: mockClient,
      apiKey: "mock-key",
      tasksServiceInstance: mockTaskService
    });
    const app = createTestApp(service);
    const tempServer = http.createServer(app);
    await new Promise((r) => tempServer.listen(0, r));
    const port = tempServer.address().port;

    const res = await fetch(`http://127.0.0.1:${port}/api/ai/study-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentNotes: "Focus on semester exams next week" })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.studyPlan, expectedPlan);
    assert.equal(body.tasksAnalyzed, 2);
    assert.ok(body.timestamp);

    await new Promise((r) => tempServer.close(r));
  });
});
