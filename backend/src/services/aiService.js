import { GoogleGenAI } from "@google/genai";
import { taskService } from "./taskService.js";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const SYSTEM_INSTRUCTION = `You are StudyPilot, an expert AI study companion designed specifically for a 2nd-year B.Tech Computer Science and Engineering (CSE) student.

Your core expertise includes:
1. Data Structures & Algorithms (DSA): Arrays, Linked Lists, Stacks, Queues, Binary Trees, BST, Graphs (BFS/DFS, Dijkstra, MST), Dynamic Programming, Greedy, Recursion, Time & Space Complexity (Big-O).
2. C++ & Object-Oriented Programming (OOP): Memory management, pointers, references, RAII, classes, constructors/destructors, inheritance, polymorphism (virtual functions, vtables), templates, and STL (vector, map, set, unordered_map, priority_queue).
3. Operating Systems (OS): Process vs thread, CPU scheduling algorithms, process synchronization (critical section, mutex, semaphores, monitors), Deadlocks (Banker's algorithm), memory management (paging, segmentation, virtual memory, page replacement algorithms), file systems.
4. Database Management Systems (DBMS): Relational model, ER diagrams, SQL queries, Relational Algebra, Normalization (1NF, 2NF, 3NF, BCNF) with functional dependencies, Transactions & Concurrency Control (ACID, 2PL, Serializability), Indexing (B/B+ trees).
5. Exam & Interview Revision: Concise summaries, step-by-step problem-solving methods, pseudocode explanations, and revision flashcard-style answers.

Behavior guidelines:
- Be encouraging, clear, precise, and pedagogically sound.
- Use well-commented code snippets (C++ or standard pseudocode) when explaining algorithms or system concepts.
- When helping with study planning, create realistic, prioritized schedules that give extra focus to approaching deadlines and high-priority coursework.
- Never claim you have voice capabilities or an active Alexa connection. Stay focused on text-based study guidance.`;

export class AIService {
  constructor({
    apiKey = process.env.GEMINI_API_KEY,
    model = DEFAULT_MODEL,
    client = null,
    tasksServiceInstance = taskService
  } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.taskService = tasksServiceInstance;
    // Defer client creation until needed to respect env loading order.
    this.client = client || null;
  }

  // Lazily instantiate the Gemini client if an API key is now available.
  ensureClient() {
    if (!this.client) {
      const key = process.env.GEMINI_API_KEY;
      if (key) {
        this.client = new GoogleGenAI({ apiKey: key });
        this.apiKey = key;
      }
    }
  }

  /**
   * Check if AI provider has a configured API key.
   */
  isConfigured() {
    return Boolean(this.apiKey || this.client);
  }

  /**
   * Get public configuration status for UI.
   */
  // Ensure the Gemini client is created if the API key is present.
  getStatus() {
    this.ensureClient();
    const configured = this.isConfigured();
    return {
      configured,
      provider: "Google Gemini",
      model: this.model,
      instructions: !configured
        ? "To enable genuine AI responses, obtain a free Gemini API key from https://aistudio.google.com/ and set GEMINI_API_KEY in your backend .env file."
        : null
    };
  }

  /**
   * Validate incoming messages array.
   */
  _validateMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages must be a non-empty array of chat turns.");
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || typeof msg !== "object") {
        throw new Error(`Message at index ${i} is invalid.`);
      }
      if (!["user", "assistant"].includes(msg.role)) {
        throw new Error(`Message at index ${i} has invalid role '${msg.role}'. Must be 'user' or 'assistant'.`);
      }
      if (typeof msg.content !== "string" || !msg.content.trim()) {
        throw new Error(`Message at index ${i} has empty content.`);
      }
      if (msg.content.length > 8000) {
        throw new Error(`Message at index ${i} exceeds maximum length of 8000 characters.`);
      }
    }
  }

  /**
   * Generate AI chat completion.
   */
  async chat({ messages }) {
    // Ensure Gemini client is instantiated (in case env was loaded after import)
    this.ensureClient();

    if (!this.isConfigured()) {
      const err = new Error(
        "AI study companion is not yet configured. Please set GEMINI_API_KEY in backend/.env with an API key from Google AI Studio (https://aistudio.google.com/)."
      );
      err.statusCode = 503;
      err.code = "AI_NOT_CONFIGURED";
      throw err;
    }

    this._validateMessages(messages);

    // Format chat turns for Gemini API
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION
        }
      });

      const replyText = response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
      if (!replyText) {
        throw new Error("No text content returned by the AI provider.");
      }

      return {
        reply: replyText,
        model: this.model,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      // Re‑throw with clean error details
      const providerError = new Error(`AI Provider Error: ${err.message || "Failed to generate AI response"}`);
      providerError.statusCode = err.status || 502;
      providerError.originalError = err.message;
      throw providerError;
    }
  }


  /**
   * Workflow: Generate realistic study plan using real pending tasks and deadlines.
   */
  async generateStudyPlan({ studentNotes = "" } = {}) {
    if (!this.isConfigured()) {
      const err = new Error(
        "AI study companion is not yet configured. Please set GEMINI_API_KEY in backend/.env with an API key from Google AI Studio (https://aistudio.google.com/)."
      );
      err.statusCode = 503;
      err.code = "AI_NOT_CONFIGURED";
      throw err;
    }

    // Fetch real tasks from taskService
    const pendingTasks = await this.taskService.getAllTasks("todo");
    const stats = await this.taskService.getStats();

    if (pendingTasks.length === 0) {
      return {
        studyPlan: "🎉 You have no pending study tasks or deadlines in StudyPilot right now! Add some tasks to your dashboard first, and I will craft a personalized day-by-day revision schedule for you.",
        tasksAnalyzed: 0,
        timestamp: new Date().toISOString()
      };
    }

    // Format tasks for the prompt
    const tasksSummary = pendingTasks
      .map((t, idx) => {
        return `${idx + 1}. [${t.priority.toUpperCase()}] "${t.title}" (${t.subject}) - Due: ${t.dueDate}, Est: ~${t.estimatedMinutes} mins`;
      })
      .join("\n");

    const prompt = `Here are my current pending coursework tasks and academic deadlines:

${tasksSummary}

Current Statistics:
- Total Remaining Tasks: ${stats.remaining}
- Total Estimated Study Time: ~${Math.round(stats.totalEstimatedMinutesRemaining / 60)} hours (${stats.totalEstimatedMinutesRemaining} minutes)
- Overdue Tasks: ${stats.overdueCount}
- Due Soon (within 3 days): ${stats.dueSoonCount}
${studentNotes ? `\nAdditional Student Focus Notes: "${studentNotes}"\n` : ""}

Please generate a realistic, structured, day-by-day Study & Revision Plan for these tasks.
Structure the response with:
1. 🎯 Priority Overview (which tasks require immediate focus based on deadlines and priority)
2. 📅 Day-by-Day Schedule (group tasks into manageable 45-90 min study blocks with recommended breaks)
3. 💡 Strategy Tips (e.g. revision strategies for DSA problem solving, OS theory memory techniques, or DBMS query practice)
4. 🏁 Checkpoint Goal (what success looks like once these tasks are checked off)`;

    const messages = [{ role: "user", content: prompt }];
    const chatResult = await this.chat({ messages });

    return {
      studyPlan: chatResult.reply,
      tasksAnalyzed: pendingTasks.length,
      model: this.model,
      timestamp: new Date().toISOString()
    };
  }
}

export const aiService = new AIService();
