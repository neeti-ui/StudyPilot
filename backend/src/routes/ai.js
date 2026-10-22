import { Router } from "express";
import { aiService } from "../services/aiService.js";

const router = Router();

// GET /api/ai/status - Returns configuration status
router.get("/status", (req, res) => {
  res.status(200).json(aiService.getStatus());
});

// POST /api/ai/chat - Process multi-turn conversation
router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({
        error: "Validation error: 'messages' array is required."
      });
    }

    const response = await aiService.chat({ messages });
    res.status(200).json(response);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      error: err.message,
      code: err.code || "AI_ERROR"
    });
  }
});

// POST /api/ai/study-plan - Workflow generating study plan from real tasks
router.post("/study-plan", async (req, res) => {
  try {
    const { studentNotes } = req.body || {};
    const plan = await aiService.generateStudyPlan({ studentNotes });
    res.status(200).json(plan);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      error: err.message,
      code: err.code || "AI_PLAN_ERROR"
    });
  }
});

export default router;
