# Briefing for Claude Code: Fri Soft AI Agent Website

## Goal
Build a one-page website for Fri Soft Ltd (Kigali, Rwanda) where an AI agent is the main feature. When a visitor lands, they see a greeting ("Hi, how can I help you?"), quick-action buttons, a chat box and a mic button. The agent answers questions about Fri Soft's services and captures leads. This replaces the old website and becomes the demo we later resell to clients.

## Constraints
- No WordPress. Standalone project.
- Frontend: plain HTML, CSS and vanilla JavaScript. No framework, no build step.
- Backend: Node.js + Express, a single small proxy server.
- Must run on Namecheap shared hosting (cPanel "Setup Node.js App"). Keep it portable so it can move to Cloudflare Workers later without a rewrite (keep the Claude call and business logic in one separate module).
- The Claude API key lives only in a server environment variable, never in frontend code or the repo.
- Cheap by design: model `claude-haiku-5-5`, short answers, `max_tokens` around 300, prompt caching on the system prompt.

## Project structure
```
/public
  index.html        landing page + widget markup
  styles.css
  widget.js         chat UI, quick buttons, voice
/server
  server.js         Express app, routes, rate limiting
  agent.js          Claude API call + system prompt loading
  leads.js          lead storage + notification
  config.json       system prompt, branding, contacts, lead email
.env.example        ANTHROPIC_API_KEY, LEAD_EMAIL, SMTP settings, MONTHLY_CAP
README.md           setup + deploy steps for Namecheap
```
This project is a single-tenant template: no multi-client logic and no `clientId`. Keep everything business-specific (system prompt, branding, contacts, lead email, caps, allowed domain) in `config.json`, so a new client project is a copy of this project with a new config, its own API key, and its own deployment.

## Landing page
Modern, clean, fast, mobile-first (most visitors are on phones).
- Hero: headline about building software that works for Rwandan businesses, with the AI agent chat embedded or opening automatically below it.
- Quick buttons: Services, Pricing, Book a call, Contact. Static answers come from the config and do not call the API.
- Services section: Dish Dash (restaurant ordering SaaS), FSA_v2 trading journal, custom web development, private business email hosting. Use placeholder copy and mark `TODO: confirm` where details are unknown.
- Contact fallback: phone, email (frisoftltd@gmail.com), location, WhatsApp link, for visitors who prefer reading.
- Visual direction: dark or light neutral base, one strong accent color, generous spacing, subtle animation on the chat opening. Avoid generic template look. Propose a palette and show it before building everything.

## Chat widget behavior
- Opens automatically a couple of seconds after load with a text greeting. No audio on load (browsers block autoplay).
- Messages stream in word by word if the host allows it; otherwise fall back to a normal full response without breaking.
- Mic button: browser speech recognition (Web Speech API) for input. Speaker toggle: browser speech synthesis to read replies aloud, off by default, tap to enable. If the browser does not support it, hide the buttons gracefully.
- Keep conversation history in the page and send the last ~10 messages per request.
- Language: English by default, replies in French if the visitor writes French. Kinyarwanda is best effort; the agent should say so honestly if it is unsure.

## Backend
- `POST /api/chat`: takes `messages`, loads the system prompt from `config.json`, calls Claude, returns the reply (streamed if possible).
- Rate limiting per IP (for example 20 messages per 10 minutes), a cap on message length and a hard monthly spend/message cap read from `.env`. When the cap is hit, the agent replies with the contact details instead of failing.
- `POST /api/lead`: saves name, phone, email, message. Store in a local JSON/SQLite file first (MySQL later if needed), and email the owner. Add a WhatsApp notification as a later step.
- CORS restricted to the site's own domain (configurable) so others cannot use our endpoint.
- Basic input sanitation and no logging of the API key.

## Agent system prompt (for `frisoft.json`)
- Role: friendly, concise assistant for Fri Soft Ltd, a software company in Kigali.
- Knows only the services and facts in the config. If unsure, say so and offer to connect the visitor to a person. Never invent prices, timelines or promises.
- Keeps answers to 2-4 sentences. Asks one question at a time.
- When a visitor shows buying interest, asks for name and phone (or email) and triggers the lead capture.
- Stays on Fri Soft's business; politely declines unrelated requests.
- Placeholders for pricing and hours marked `TODO: confirm` so I can fill them in.

## Deliverables and process
1. Show the proposed folder structure and design palette first, then wait for my OK.
2. Build the static page and widget with a mock reply (no API) so I can review the design.
3. Build the backend and connect Claude.
4. Add lead capture and rate/spend limits.
5. Add voice.
6. Write `README.md` with exact Namecheap deploy steps (Node.js app setup, env variables, static file location) and a note on how to move to Cloudflare Workers.
7. Test: a normal chat, a lead capture, hitting the rate limit, hitting the monthly cap, and mobile layout.

## Things to flag to me, not decide silently
- Whether streaming works on the Namecheap host.
- Any placeholder content I must fill in (prices, hours, WhatsApp number).
- Anything in the plan that would push monthly API cost up.
