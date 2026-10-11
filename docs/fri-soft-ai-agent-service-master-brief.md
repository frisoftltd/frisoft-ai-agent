# Master Brief: Fri Soft AI Agent Website Service

Use this as the project instructions for the "Fri soft - AI agent website services" project, and as the top-level context for every Claude Code session on it.

## 1. What we are building
A productized service from Fri Soft Ltd (Kigali, Rwanda): **websites with a built-in AI agent that talks to visitors by chat and voice, answers questions about the business, and captures leads.** The agent is the selling point.

**Single-tenant model: every client website is its own independent project.** There is no shared backend and no multi-client platform. Each client gets their own copy of a Fri Soft template, with their own config, their own API key, their own hosting and their own domain.

Two things are built, in this order:
1. **Fri Soft's own site:** the live demo and the first project.
2. **A clean template:** the Fri Soft site cleaned up so it can be copied for each new client in a few hours.

## 2. Who we sell to
Small and medium businesses and institutions in Rwanda (and later East Africa) that have a weak or outdated website and lose enquiries because nobody answers fast. Examples: restaurants, clinics, schools, hotels and tour operators, construction and service firms, shops.

Their pain: slow replies, visitors leave, no leads captured after hours.
Our promise: visitors get an answer in seconds, and the owner gets the lead on their phone.

## 3. Service offers (to be priced by Fri Soft, not invented here)
- **Option A: New site + agent.** A modern one-page or small site built by Fri Soft with the agent as the main feature, replacing the old website. This is the main offer.
- **Option B: Agent add-on.** For clients who keep their current site. Fri Soft deploys a small separate agent backend for that client, and the client adds one script tag to their site.
- **Monthly plan:** hosting, API usage within a fair limit, prompt and content updates, lead reports.
- **Add-ons:** better voice quality, WhatsApp lead alerts, extra languages, conversation reports.

Pricing in RWF: `TODO: Innocent to decide setup fee, monthly fee and usage limits per tier.` Check pricing against the real API cost of each client before it is published.

## 4. Architecture (one project per client)
- **Template project:** a single repository containing the static site, `widget.js`, a small Node.js (Express) server, and one `config.json`. Everything specific to a business lives in `config.json`: business name, system prompt, services, prices (optional), hours, contacts, brand colors, greeting, quick buttons, lead email or WhatsApp, allowed domain, message cap, language settings.
- **New client = copy the template**, replace `config.json` and branding, set that client's environment variables, deploy to that client's hosting and domain. No shared code path between clients at runtime.
- **Backend per client:** one Node.js server with `POST /api/chat` and `POST /api/lead`. Keep the Claude call and business logic in one isolated module so the project can run on Namecheap shared hosting (cPanel "Setup Node.js App") or move to Cloudflare Workers without a rewrite.
- **Model:** Claude Haiku 5.5 by default for cost. Keep the model name in `config.json` so it can change without code edits.
- **Voice:** browser speech recognition and speech synthesis first (free). Paid voice provider only for clients who pay for it.
- **Storage:** SQLite or a JSON file for leads and conversation logs, local to each client's project.
- **API keys and billing:** create a **separate API key per client** in the Anthropic Console, each with its own spend limit. This makes each client's real cost visible and a runaway site cannot affect any other client. The key lives only in that project's server environment variables, never in frontend code or git.
- **Hosting:** decide per client whether the project runs on the client's own hosting or on Fri Soft's hosting under the client's domain.

**Honest trade-off of single-tenant:** every fix or improvement must be applied to each client's copy separately. This is fine for the first 5-10 clients. To keep it manageable: keep one template repo as the source of truth, tag versions, keep client-specific changes only in `config.json` and branding files, and keep a short update checklist. If the client count grows past what is comfortable to update by hand, revisit this decision then, not now.

## 5. Safety, cost and trust rules (non-negotiable, apply to every project)
- Per-IP rate limits, message length limits, short answers (`max_tokens` around 300), prompt caching on the system prompt.
- Per-project monthly message cap in `config.json` plus the spend limit on that project's API key. When the cap is hit, the agent shows the business's contact details instead of failing.
- CORS locked to that client's own domain so nobody else can use the endpoint.
- The agent answers only from `config.json`. If unsure, it says so and offers to connect the visitor to a person. It never invents prices, promises or policies.
- Visitors are told they are talking to an AI.
- Collect only what is needed for a lead (name, phone or email, short message). Add a short privacy notice in the widget. `TODO: check Rwanda's data protection requirements for storing leads and conversation logs, and set a retention period.`
- No handling of payments, medical advice or legal advice inside the agent.

## 6. Roadmap
**Phase 0: Setup (this week).** API key and spend limit, hosting check, domain decision, project folder and repo, collect Fri Soft content (services, prices, hours, contacts, FAQs, logo, colors).

**Phase 1: Fri Soft demo site.** Design palette approval, static page with mocked chat, then real Claude connection, lead capture, rate limits and caps, voice, deploy, soft launch and prompt tuning from real conversations.

**Phase 2: Turn it into a template.** Move every business-specific item into `config.json`, remove Fri Soft hardcoding, write a README for creating a new client project, and test the process by creating a dummy second client from scratch and timing it.

**Phase 3: First paying clients.** Pick 2-3 friendly businesses, create their projects from the template, collect feedback, fix what breaks, record the real API cost and setup time per client.

**Phase 4: Sell and scale.** Sales page and demo video, one-page proposal template, simple weekly lead report email per client, optional WhatsApp alerts and extra languages.

## 7. Client project checklist (to refine in Phase 3)
1. Short discovery call: what the business sells, top customer questions, what counts as a lead.
2. Collect content: services, prices (or "contact us"), hours, contacts, 10 real FAQs, logo, colors, tone.
3. Copy the template, write `config.json` and the system prompt with the client, apply branding.
4. Create the client's API key with a spend limit, set environment variables, set allowed domain and caps.
5. Test: normal chat, wrong-answer cases, lead capture, rate limit, mobile, voice.
6. Deploy to the client's hosting and domain, then review real conversations after 2 weeks.

## 8. Open decisions for Innocent
- Domain for the Fri Soft site.
- Pricing tiers and what counts as "fair use".
- Per client: who owns the hosting and the API billing (Fri Soft with a monthly fee, or the client directly).
- Whether the old Fri Soft website content must be kept or fully replaced.
- Languages promised at launch (English and French are safe; Kinyarwanda is best effort until tested).
- Who handles client support after launch.

## 9. How Claude should work on this project
- Write structured briefings for Claude Code, not raw code to paste by hand.
- Give honest, calibrated assessments, including when an idea is weak or a cost estimate is uncertain. No hype.
- Flag anything that could raise API cost, break the caps, or expose an API key.
- Mark any fact not provided by Innocent as `TODO: confirm` instead of guessing.
- Keep answers short and decisions explicit. Ask one question at a time when something blocks progress.
- Build in the order of the roadmap. Do not start Phase 2 work before the Phase 1 demo is live and tested.

## 10. First action in a new session
Read this brief and `fri-soft-ai-agent-briefing.md` (the detailed Phase 1 build brief), then ask Innocent which phase step we are on, and continue from there.
