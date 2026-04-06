const fs   = require("fs").promises;
const path = require("path");

// Simple JSON file database — no setup needed
// In production you'd use PostgreSQL or Supabase
const DB_FILE = path.join(__dirname, "../leads.json");

// Simple lock to prevent concurrent file writes from corrupting data
let writeLock = Promise.resolve();

async function loadLeads() {
    try {
        const data = await fs.readFile(DB_FILE, "utf8");
        return JSON.parse(data);
    } catch (err) {
        if (err.code === "ENOENT") return []; // File doesn't exist yet
        console.error("⚠️ Failed to load leads:", err.message);
        return [];
    }
}

async function saveLeads(leads) {
    await fs.writeFile(DB_FILE, JSON.stringify(leads, null, 2));
}

async function saveLead(phone, userMessage, botReply) {
    // Queue writes so concurrent requests don't corrupt the file
    writeLock = writeLock.then(async () => {
        const leads = await loadLeads();

        // Check if this phone number already exists
        const existing = leads.find(l => l.phone === phone);

        if (existing) {
            // Add to conversation history
            existing.conversations.push({
                timestamp:   new Date().toISOString(),
                userMessage,
                botReply
            });
            existing.lastSeen = new Date().toISOString();
        } else {
            // New lead
            leads.push({
                phone,
                firstSeen:     new Date().toISOString(),
                lastSeen:      new Date().toISOString(),
                conversations: [
                    {
                        timestamp: new Date().toISOString(),
                        userMessage,
                        botReply
                    }
                ]
            });
            console.log(`🆕 New lead saved: ${phone}`);
        }

        await saveLeads(leads);
    }).catch(err => {
        console.error("❌ Failed to save lead:", err.message);
    });

    return writeLock;
}

module.exports = { saveLead };