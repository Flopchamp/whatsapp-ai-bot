# WhatsApp AI Bot

A WhatsApp chatbot powered by GPT-4o that handles customer support,
lead capture, and appointment booking automatically.

## Features
- Replies to customer messages using GPT-4o
- Captures leads (name, phone, intent) and saves to database
- Remembers conversation history per user
- Handles support questions, bookings, and lead collection

## Tech Stack
- Node.js + Express (webhook server)
- WhatsApp Cloud API (Meta)
- OpenAI GPT-4o
- ngrok (local development)

## Setup
1. Clone the repo
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your keys
4. Run `node index.js`
5. Run `ngrok http 3000` in a second terminal
6. Set the ngrok URL as your webhook in Meta developer dashboard

## Architecture
Customer (WhatsApp) → Webhook → Node.js → GPT-4o → Reply → WhatsApp
                                    ↓
                             Lead stored (JSON/DB)