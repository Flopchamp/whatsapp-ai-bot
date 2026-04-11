const express = require("express");
const crypto  = require("crypto");
const dotenv  = require("dotenv");

dotenv.config();

const { handleMessage } = require("./handlers/messageHandler");

const app  = express();
const PORT = process.env.PORT || 3000;

// Parse incoming JSON and keep raw body for signature verification
app.use(express.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    }
}));

// ── Middleware: Verify webhook signature ──────────────────────────────────────
// Meta signs every POST request with X-Hub-Signature-256 using your APP_SECRET.
// This ensures the request genuinely came from Meta and wasn't spoofed.
function verifySignature(req, res, next) {
    const signature = req.get("X-Hub-Signature-256");

    if (!process.env.APP_SECRET) {
        console.warn("⚠️ APP_SECRET not set — skipping signature verification");
        return next();
    }

    if (!signature) {
        console.warn("⚠️ Missing X-Hub-Signature-256 header");
        return res.sendStatus(401);
    }

    const expected = "sha256=" + crypto
        .createHmac("sha256", process.env.APP_SECRET)
        .update(req.rawBody)
        .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        console.warn("⚠️ Invalid webhook signature");
        return res.sendStatus(401);
    }

    next();
}

// ── Route 1: Webhook verification ────────────────────────────────────────────
// When you set up the webhook on Meta, they send a GET request to verify
// your server is real. This handles that handshake.
app.get("/webhook", (req, res) => {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        console.log("✅ Webhook verified by Meta!");
        res.status(200).send(challenge);
    } else {
        console.log("❌ Webhook verification failed");
        res.sendStatus(403);
    }
});

// ── Route 2: Receive messages ─────────────────────────────────────────────────
// Every time someone sends your WhatsApp bot a message,
// Meta sends it here as a POST request
app.post("/webhook", verifySignature, async (req, res) => {
    const body = req.body;

    // Make sure this is a WhatsApp message
    if (body.object !== "whatsapp_business_account") {
        return res.sendStatus(404);
    }

    try {
        const entry   = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value   = changes?.value;
        const message = value?.messages?.[0];

        if (!message) {
            return res.sendStatus(200); // No message, ignore
        }

        const from = message.from;        // Sender's phone number
        const text = message.text?.body;  // Message text

        console.log(`📩 Message from ${from}: ${text}`);

        // Send to OpenAI and reply
        await handleMessage(from, text);

    } catch (err) {
        console.error("Error processing message:", err);
    }

    res.sendStatus(200); // Always respond 200 to WhatsApp
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
});