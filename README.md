# Fri Soft AI Agent

A single-tenant website template from Fri Soft Ltd (Kigali, Rwanda): a small marketing site with a built-in AI chat/voice agent that answers visitor questions from a per-project config and captures leads. Each client gets their own copy of this template with its own `config.json`, API key, hosting and domain — there is no shared backend between clients.

## Folder structure

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
/docs               project briefs (master brief + detailed build brief)
.env.example        ANTHROPIC_API_KEY, LEAD_EMAIL, SMTP settings, MONTHLY_CAP
package.json
README.md
```

## Status: scaffold only

No working logic yet. Phase 1 (Fri Soft demo site) builds the real landing page, chat widget, Claude connection, lead capture and voice — see `docs/fri-soft-ai-agent-briefing.md` and `docs/fri-soft-ai-agent-service-master-brief.md` for the roadmap.

## Deploy the static page to cPanel

The page in `public/` needs no Node to run (the chat reply is mocked in the browser), so it can be deployed as a plain static zip through cPanel File Manager.

Build the zip:

```powershell
npm run zip
```

This creates `deploy/frisoft-site.zip` containing only the contents of `public/` (`index.html`, `styles.css`, `widget.js`, `logo.png`), with `index.html` at the **top level** of the archive — no wrapping `public` folder inside it. The script verifies this and fails loudly if `index.html` isn't at the top level, or if the zip picked up anything from `server/`, `docs/`, `node_modules/`, `.env`, or any `package*.json` file.

`deploy/` is gitignored — the zip is a build output, never committed. Re-run `npm run zip` after any change to `public/` before re-uploading.

To deploy: upload `deploy/frisoft-site.zip` in cPanel File Manager to the subdomain's document root, then extract it there so `index.html` ends up directly in that folder (not nested inside a `public` or `frisoft-site` subfolder).
