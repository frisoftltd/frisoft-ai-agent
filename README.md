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

## Deploy the Node app to cPanel

Once the agent needs a running Node process (Step 3 onward: `/api` routes, Claude connection, lead capture), deploy it through cPanel's **Setup Node.js App** feature instead of as a static zip.

Build the zip:

```powershell
npm run zip:app
```

This creates `deploy/frisoft-app.zip` containing `package.json`, `package-lock.json`, `server/` (including `config.json`), and `public/`, with `package.json` and `server/server.js` at the **top level** of the archive — no wrapping folder. It excludes `node_modules/`, `.env` and any `.env.*` files, `docs/`, `deploy/`, `.git/`, `README`, and any `*.zip`, so no secrets or build output end up in the archive. The script verifies this and fails loudly (and deletes the zip) if anything forbidden gets in, or if `package.json`/`server/server.js` aren't at the top level.

To deploy:

1. Upload `deploy/frisoft-app.zip` to `/home/<user>/frisoft-ai-agents` (the app root configured in cPanel).
2. Extract it there, so `package.json` and `server/server.js` end up directly inside `frisoft-ai-agents` (not nested inside another folder).
3. In cPanel's **Setup Node.js App**, open the app and click **Run NPM Install**.
4. Set the required environment variables (see `.env.example`) in the app's config, then restart the app.

`deploy/` is gitignored — the zip is a build output, never committed. Re-run `npm run zip:app` after any change to `package.json`, `server/`, or `public/` before re-uploading.

This zip-upload flow still works as a fallback (e.g. if Git deployment below isn't set up yet), but once cPanel Git Version Control is configured, prefer that — no zip, no manual upload.

## Deploy updates with cPanel Git Version Control

`.cpanel.yml` at the repo root lets cPanel pull this repo and deploy it into the app root directly, without building or uploading a zip for every change.

### One-time setup

1. In cPanel, open **Git Version Control** → **Create**.
2. Clone URL: `https://github.com/frisoftltd/frisoft-ai-agent.git`
3. Repository path: `repositories/frisoft-ai-agent` (clones to `$HOME/repositories/frisoft-ai-agent`).
4. Leave the checkout branch as `main`.
5. After the first clone, go to **Setup Node.js App**, open the `frisoft-ai-agents` app, and click **Run NPM Install** once to populate `node_modules`.

### Routine updates

1. Push your changes to `main` on GitHub as usual.
2. In cPanel's **Git Version Control**, open the repo and click **Update from Remote** (pulls the new commits into `$HOME/repositories/frisoft-ai-agent`).
3. Click **Deploy HEAD Commit**. This runs `.cpanel.yml`, which copies `package.json`, `package-lock.json`, `server/`, and `public/` into `$HOME/frisoft-ai-agents/` (overwriting the old copies, never deleting anything else there) and then touches `tmp/restart.txt` to restart the app.
4. Only re-run **Run NPM Install** in **Setup Node.js App** if `package.json`/`package-lock.json` changed (new or updated dependency) — a plain code change to `server/` or `public/` doesn't need it.

Environment variables such as `ANTHROPIC_API_KEY`, `LEAD_EMAIL`, and the SMTP settings live **only** in the **Setup Node.js App** page's environment variable editor — they are never committed to the repo and `.cpanel.yml` never touches `.env`.
