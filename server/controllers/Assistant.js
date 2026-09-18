const { runAssistant } = require("../ml/assistant/assistantService");

const MAX_MESSAGE_LENGTH = 500;

const DISCLAIMER =
  "Answers are generated from live application analytics only. Verify important decisions against the underlying attendance records.";

/** POST /api/analytics/assistant — read-only; the assistant never writes, emails, or takes action. */
async function postAssistant(req, res) {
  try {
    const { message, context } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, error: "message is required" });
    }
    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ success: false, error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
    }

    const safeContext = {
      semname: typeof context?.semname === "string" ? context.semname : null,
      batch: typeof context?.batch === "string" ? context.batch : null
    };

    const result = await runAssistant({ user: req.user, message: message.trim(), context: safeContext });

    return res.status(200).json({
      success: true,
      data: { answer: result.answer, context: result.context },
      model: result.model,
      disclaimer: DISCLAIMER
    });
  } catch (err) {
    if (err && err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    console.error("Assistant error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

module.exports = { postAssistant };
