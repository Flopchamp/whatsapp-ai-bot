const { getAIResponse } = require("./aiHandler");
const { sendWhatsAppMessage } = require("./whatsappHandler");
const { saveLead } = require("./dbHandler");

async function handleMessage(from, text) {
    if (!text) return; // Ignore non-text messages for now

    console.log(`🤖 Processing message from ${from}...`);

    // Step 1: Get AI response
    const reply = await getAIResponse(from, text);

    // Step 2: Send reply back to WhatsApp
    await sendWhatsAppMessage(from, reply);

    // Step 3: Save lead to database
    await saveLead(from, text, reply);
}

module.exports = { handleMessage };