const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Store conversation history per user
// In production you'd store this in a database
const conversationHistory = {};

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

    console.log(`🤖 AI reply: ${reply}`);
    return reply;
}

module.exports = { getAIResponse };