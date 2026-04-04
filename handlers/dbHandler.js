const fs   = require("fs");
const path = require("path");

// Simple JSON file database — no setup needed
// In production you'd use PostgreSQL or Supabase
const DB_FILE = path.join(__dirname, "../leads.json");

function loadLeads() {
    if (!fs.existsSync(DB_FILE)) return [];
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
}

function saveLeads(leads) {
    fs.writeFileSync(DB_FILE, JSON.stringify(leads, null, 2));
}

async function saveLead(phone, userMessage, botReply) {
    const leads = loadLeads();

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

    saveLeads(leads);
}

module.exports = { saveLead };