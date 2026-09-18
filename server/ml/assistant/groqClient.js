const Groq = require("groq-sdk");

/**
 * Thin wrapper around the already-installed `groq-sdk` dependency (present
 * in package.json/.env before this step, unused until now). No API key is
 * ever sent to the client — this file only runs server-side and reads keys
 * from environment variables.
 *
 * Multiple GROQ_API_KEY* vars were already provisioned in .env; treated
 * here as a rate-limit fallback chain (try the next key on 429) rather than
 * load-balancing, since a single chat request only ever needs one to work.
 */

const KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3
].filter(Boolean);

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const TIMEOUT_MS = 20000;

let keyIndex = 0;

function currentClient() {
  return new Groq({ apiKey: KEYS[keyIndex], timeout: TIMEOUT_MS });
}

/**
 * @param {Array<{role: 'system'|'user', content: string}>} messages
 * @returns {Promise<{text: string, model: string}>}
 */
async function chat(messages, { maxTokens = 1024, temperature = 0.2 } = {}) {
  if (!KEYS.length) {
    const err = new Error("Assistant is not configured");
    err.statusCode = 503;
    throw err;
  }

  let lastErr = null;

  for (let attempt = 0; attempt < KEYS.length; attempt++) {
    try {
      const completion = await currentClient().chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature
      });
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty response from model");
      return { text, model: MODEL };
    } catch (err) {
      lastErr = err;
      if (err?.status === 429 && attempt < KEYS.length - 1) {
        keyIndex = (keyIndex + 1) % KEYS.length;
        continue;
      }
      break;
    }
  }

  const wrapped = new Error(
    lastErr?.status === 429 ? "Assistant is receiving too many requests right now" : "Assistant model request failed"
  );
  wrapped.statusCode = lastErr?.status === 429 ? 429 : lastErr?.name === "APIConnectionTimeoutError" ? 504 : 502;
  throw wrapped;
}

module.exports = { chat, MODEL };
