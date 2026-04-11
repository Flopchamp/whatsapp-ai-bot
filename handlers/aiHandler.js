const OpenAI = require("openai");
const fs     = require("fs").promises;
const path   = require("path");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Persist conversation history to disk so it survives restarts
const HISTORY_FILE = path.join(__dirname, "../conversation_history.json");

// Simple lock to prevent concurrent file writes from corrupting data
let writeLock = Promise.resolve();

async function loadHistory() {
    try {
        const data = await fs.readFile(HISTORY_FILE, "utf8");
        return JSON.parse(data);
    } catch (err) {
        if (err.code === "ENOENT") return {}; // File doesn't exist yet
        console.error("⚠️ Failed to load conversation history:", err.message);
        return {};
    }
}

async function saveHistory() {
    writeLock = writeLock.then(async () => {
        try {
            await fs.writeFile(HISTORY_FILE, JSON.stringify(conversationHistory, null, 2));
        } catch (err) {
            console.error("⚠️ Failed to save conversation history:", err.message);
        }
    }).catch(err => {
        console.error("⚠️ Failed to save conversation history:", err.message);
    });
    return writeLock;
}

// Load existing history from disk on startup (filled in init())
let conversationHistory = {};

async function init() {
    conversationHistory = await loadHistory();
}

// Run initialization immediately
const initPromise = init();

// Max number of messages (user + assistant) to keep per user, excluding the system prompt
const MAX_HISTORY_LENGTH = 20;

const SYSTEM_PROMPT = {
    role: "system",
    content: `You are a helpful business assistant on WhatsApp.
                
Your goals:
1. Answer customer questions clearly and helpfully
2. Capture leads — if someone shows interest, ask for their name and email
3. Help book appointments — ask for preferred date and time
4. Be concise — WhatsApp messages should be short and friendly

When capturing a lead always ask:
- Their name
- Their email
- What service they are interested in

Keep responses under 3 sentences unless explaining something complex.`
};

async function getAIResponse(userId, userMessage) {
    // Ensure history is loaded from disk before first use
    await initPromise;

    // Initialize history for new users
    if (!conversationHistory[userId]) {
        conversationHistory[userId] = [SYSTEM_PROMPT];
    }

    // Add user message to history
    conversationHistory[userId].push({
        role: "user",
        content: userMessage
    });

    // Prune history to prevent unbounded growth (keep system prompt + last N messages)
    if (conversationHistory[userId].length > MAX_HISTORY_LENGTH + 1) {
        conversationHistory[userId] = [
            SYSTEM_PROMPT,
            ...conversationHistory[userId].slice(-(MAX_HISTORY_LENGTH))
        ];
    }

    // Get response from GPT-4o
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: conversationHistory[userId],
        max_tokens: 300
    });

    const reply = response.choices[0].message.content;

    // Add AI reply to history so it remembers the conversation
    conversationHistory[userId].push({
        role: "assistant",
        content: reply
    });

    // Persist to disk so history survives server restarts
    await saveHistory();

    console.log(`🤖 AI reply: ${reply}`);
    return reply;
}

module.exports = { getAIResponse };