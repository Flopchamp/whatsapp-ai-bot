const axios = require("axios");

// WhatsApp Cloud API version — override via WHATSAPP_API_VERSION env var
const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

async function sendWhatsAppMessage(to, message) {
    const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`;

    const data = {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: message }
    };

    try {
        await axios.post(url, data, {
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
        console.log(`✅ Message sent to ${to}`);
    } catch (err) {
        const detail = err.response?.data?.error?.message || err.response?.data || err.message;
        console.error(`❌ Failed to send message to ${to}:`, detail);
        throw new Error(`WhatsApp API error: ${detail}`);
    }
}

module.exports = { sendWhatsAppMessage };