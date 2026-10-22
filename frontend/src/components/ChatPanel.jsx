import React, { useState, useRef, useEffect } from "react";

export default function ChatPanel({ tasks = [] }) {
  const [aiStatus, setAiStatus] = useState({
    configured: false,
    loading: true,
    model: "gemini-2.5-flash",
    provider: "Google Gemini",
    instructions: null
  });

  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch AI backend status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/ai/status");
        if (res.ok) {
          const data = await res.json();
          setAiStatus({ ...data, loading: false });

          // Initialize welcoming message based on actual configuration
          const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          if (data.configured) {
            setMessages([
              {
                id: "init-welcome",
                sender: "assistant",
                text: "Hello Alex! I am StudyPilot, your AI study companion powered by Gemini. Ask me any conceptual questions in DSA, C++, OOP, Operating Systems, or DBMS—or click below to generate an optimized study plan based on your active dashboard tasks.",
                time: currentTime
              }
            ]);
          } else {
            setMessages([
              {
                id: "init-unconfigured",
                sender: "assistant",
                text: "Hello Alex! StudyPilot AI is ready to assist you once configured. To enable live AI study responses, set your free GEMINI_API_KEY in the backend/.env file (get one at https://aistudio.google.com/).",
                time: currentTime,
                isSetupNotice: true
              }
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to load /api/ai/status:", err);
        setAiStatus((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchStatus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Send a regular user message
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isSending) return;

    setErrorNotice(null);
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newUserMsg = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text,
      time: currentTime
    };

    // Prepare message history for backend
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInputVal("");
    setIsSending(true);

    // Filter to conversational turns
    const apiHistory = updatedMessages
      .filter((m) => !m.isSetupNotice)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiHistory })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to get AI response`);
      }

      const assistantMsg = {
        id: `ast-${Date.now()}`,
        sender: "assistant",
        text: data.reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        model: data.model
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setErrorNotice(err.message);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: `⚠️ ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Study planning workflow reusing backend task service
  const handleGenerateStudyPlan = async () => {
    if (isSending) return;
    setErrorNotice(null);

    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const promptMsg = {
      id: `usr-plan-${Date.now()}`,
      sender: "user",
      text: "📅 Please generate a realistic study plan from my active dashboard tasks and upcoming deadlines.",
      time: currentTime
    };

    setMessages((prev) => [...prev, promptMsg]);
    setIsSending(true);

    try {
      const res = await fetch("/api/ai/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentNotes: "Focus on approaching deadlines and core B.Tech subjects." })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Could not generate study plan`);
      }

      const planMsg = {
        id: `ast-plan-${Date.now()}`,
        sender: "assistant",
        text: data.studyPlan,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isStudyPlan: true,
        tasksAnalyzed: data.tasksAnalyzed
      };

      setMessages((prev) => [...prev, planMsg]);
    } catch (err) {
      console.error("Study plan error:", err);
      setErrorNotice(err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-plan-${Date.now()}`,
          sender: "assistant",
          text: `⚠️ ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = () => {
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages([
      {
        id: `reset-${Date.now()}`,
        sender: "assistant",
        text: "Chat history cleared. How can I assist with your B.Tech CSE studies or task planning today?",
        time: currentTime
      }
    ]);
    setErrorNotice(null);
  };

  return (
    <div className="chat-panel-card">
      {/* Header */}
      <div className="card-header chat-header">
        <div className="card-title-group">
          <h3>StudyPilot AI Assistant</h3>
          {aiStatus.loading ? (
            <span className="ai-status-tag checking">Checking AI...</span>
          ) : aiStatus.configured ? (
            <span className="ai-status-tag online">● Gemini AI Connected</span>
          ) : (
            <span className="ai-status-tag unconfigured">⚠️ API Key Required</span>
          )}
        </div>
        <div className="chat-header-actions">
          <button
            className="btn-clear-chat"
            onClick={handleClearChat}
            title="Clear current session chat history"
            disabled={messages.length <= 1 || isSending}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Unconfigured Alert Banner */}
      {!aiStatus.loading && !aiStatus.configured && (
        <div className="chat-config-warning-banner">
          <div className="config-banner-title">
            <strong>🔑 Gemini API Key Setup Required</strong>
          </div>
          <p className="config-banner-desc">
            To enable genuine AI reasoning, add your free Gemini API key to <code>backend/.env</code>:
          </p>
          <div className="config-code-box">
            <code>GEMINI_API_KEY=your_key_here</code>
          </div>
          <div className="config-banner-footer">
            <span>Free keys available at </span>
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noreferrer"
              className="config-link"
            >
              Google AI Studio (aistudio.google.com) ↗
            </a>
          </div>
        </div>
      )}

      {/* Quick Action Suggestion Chips */}
      <div className="chat-quick-chips-bar">
        <button
          className="quick-chip-btn chip-highlight"
          onClick={handleGenerateStudyPlan}
          disabled={isSending}
          title="Analyze pending tasks and build an actionable timetable"
        >
          📅 Study Plan from Tasks
        </button>
        <button
          className="quick-chip-btn"
          onClick={() => handleSendMessage("Explain Dijkstra's shortest path algorithm step by step with C++ code example.")}
          disabled={isSending}
        >
          DSA: Dijkstra
        </button>
        <button
          className="quick-chip-btn"
          onClick={() => handleSendMessage("What is the difference between a binary semaphore and a mutex lock in Operating Systems?")}
          disabled={isSending}
        >
          OS: Mutex vs Semaphore
        </button>
        <button
          className="quick-chip-btn"
          onClick={() => handleSendMessage("How do I test if a relational schema is in Boyce-Codd Normal Form (BCNF)? Explain with functional dependencies.")}
          disabled={isSending}
        >
          DBMS: BCNF
        </button>
        <button
          className="quick-chip-btn"
          onClick={() => handleSendMessage("Explain virtual functions and how the vtable pointer works in C++ OOP.")}
          disabled={isSending}
        >
          C++: Vtable
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages-container">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble-row ${msg.sender === "user" ? "user-row" : "assistant-row"}`}
          >
            <div className={`chat-avatar ${msg.sender === "user" ? "user-avatar" : "assistant-avatar"}`}>
              {msg.sender === "user" ? "You" : "SP"}
            </div>
            <div
              className={`chat-bubble ${
                msg.sender === "user"
                  ? "user-bubble"
                  : msg.isError
                  ? "error-bubble"
                  : msg.isStudyPlan
                  ? "plan-bubble"
                  : "assistant-bubble"
              }`}
            >
              <div className="chat-bubble-header">
                <span className="sender-name">
                  {msg.sender === "user" ? "You (Alex)" : "StudyPilot AI Assistant"}
                </span>
                <span className="msg-time">{msg.time}</span>
              </div>
              <div className="bubble-text">{msg.text}</div>
              {msg.isStudyPlan && (
                <div className="plan-meta-badge">
                  <span>✓ Built from {msg.tasksAnalyzed} live dashboard tasks</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="chat-bubble-row assistant-row">
            <div className="chat-avatar assistant-avatar">SP</div>
            <div className="chat-bubble assistant-bubble typing-bubble">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-label">StudyPilot is reasoning...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        className="chat-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <input
          type="text"
          className="chat-text-input"
          placeholder={
            !aiStatus.configured
              ? "Configure GEMINI_API_KEY in backend/.env to send questions..."
              : "Ask about DSA, C++, OOP, OS, DBMS or exam revision..."
          }
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          disabled={isSending}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!inputVal.trim() || isSending}
        >
          {isSending ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
}
