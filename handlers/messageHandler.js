const { getAIResponse } = require("./aiHandler");
const { sendWhatsAppMessage } = require("./whatsappHandler");
const { saveLead } = require("./dbHandler");

// Maximum message length we'll process (characters)
const MAX_MESSAGE_LENGTH = 2000;

async function handleMessage(from, text) {
    if (!text) return; // Ignore non-text messages for now

    // Sanitize: trim whitespace and limit length
    let sanitized = text.trim();
    if (sanitized.length === 0) return;

    if (sanitized.length > MAX_MESSAGE_LENGTH) {
        sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
        console.log(`⚠️ Message from ${from} truncated to ${MAX_MESSAGE_LENGTH} chars`);
    }

    console.log(`🤖 Processing message from ${from}...`);

    // Step 1: Get AI response
    const reply = await getAIResponse(from, sanitized);

    // Step 2: Send reply back to WhatsApp
    await sendWhatsAppMessage(from, reply);

    // Step 3: Save lead to database
    await saveLead(from, sanitized, reply);
}

module.exports = { handleMessage };