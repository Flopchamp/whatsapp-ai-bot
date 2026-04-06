const { getAIResponse } = require("./aiHandler");
const { sendWhatsAppMessage } = require("./whatsappHandler");
const { saveLead } = require("./dbHandler");

// Maximum message length we'll process (characters)
const MAX_MESSAGE_LENGTH = 2000;

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Max messages per user within the time window
const RATE_LIMIT_MAX     = 10;
const RATE_LIMIT_WINDOW  = 60 * 1000; // 60 seconds
const rateLimitMap = {};

function isRateLimited(phone) {
    const now = Date.now();

    if (!rateLimitMap[phone]) {
        rateLimitMap[phone] = [];
    }

    // Remove timestamps outside the window
    rateLimitMap[phone] = rateLimitMap[phone].filter(ts => now - ts < RATE_LIMIT_WINDOW);

    if (rateLimitMap[phone].length >= RATE_LIMIT_MAX) {
        return true;
    }

    rateLimitMap[phone].push(now);
    return false;
}

async function handleMessage(from, text) {
    if (!text) return; // Ignore non-text messages for now

    // Check rate limit before processing
    if (isRateLimited(from)) {
        console.log(`🚫 Rate limited: ${from}`);
        await sendWhatsAppMessage(from, "You're sending messages too quickly. Please wait a moment and try again.");
        return;
    }

    // Sanitize: trim whitespace and limit length
    let sanitized = text.trim();
    if (sanitized.length === 0) return;

    if (sanitized.length > MAX_MESSAGE_LENGTH) {
        sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
        console.log(`⚠️ Message from ${from} truncated to ${MAX_MESSAGE_LENGTH} chars`);
    }

    console.log(`🤖 Processing message from ${from}...`);

    try {
        // Step 1: Get AI response
        const reply = await getAIResponse(from, sanitized);

        // Step 2: Send reply back to WhatsApp
        await sendWhatsAppMessage(from, reply);

        // Step 3: Save lead to database
        await saveLead(from, sanitized, reply);
    } catch (err) {
        console.error(`❌ Error handling message from ${from}:`, err.message);

        // Send a friendly fallback so the user isn't left hanging
        try {
            await sendWhatsAppMessage(
                from,
                "Sorry, I'm having trouble right now. Please try again in a moment."
            );
        } catch (sendErr) {
            console.error("❌ Failed to send fallback message:", sendErr.message);
        }
    }
}

module.exports = { handleMessage };