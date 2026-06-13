# 🚀 Prompt Library

A SpaceX-inspired, **public prompt library** with secure **server-side login**.
Anyone can browse every prompt; logged-in users can publish, edit, and delete their own.
The site is static (hosted free on GitHub Pages) and pairs with **Supabase** for managed,
server-side authentication and a Postgres database protected by **Row-Level Security**.

> **Why Supabase?** GitHub Pages only serves static files — it can't run a server, login,
> or database. Supabase provides that backend for free. Security is enforced *server-side*
> by RLS policies (see `schema.sql`), so the public `anon` key in `config.js` is safe to expose —
> it's designed for browser use and can't bypass the rules.

## ⚡ Go live in 3 steps

### 1. Create the backend (Supabase — free)
1. Sign up at **https://supabase.com** → **New project**.
2. Open **SQL Editor → New query**, paste the contents of `schema.sql`, click **Run**.
3. Go to **Project Settings → API** and copy: **Project URL** and the **anon public** key.

### 2. Connect the frontend
Edit `config.js` and paste your two values:
```js
window.SUPABASE_URL      = "https://YOURPROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "your-anon-public-key";
```
Commit the change (edit the file directly on GitHub or push locally).

### 3. Turn on GitHub Pages
**Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / `(root)` → Save**.
After ~1 minute your site is live at:
```
https://anku0669.github.io/prompt-library/
```

## ✅ Features
- **Sections/categories** — Writing, Coding, Marketing, Image & Video, Business, Research, Productivity, Other.
- **Server-side auth** — email + password sign-up / login via Supabase.
- **Public sharing** — every visitor sees all prompts; one-click **Copy**.
- **Owner-only edits** — only the author can edit/delete their prompt (enforced by RLS, not just the UI).
- **Search + filter** across titles and bodies.
- **SpaceX theme** — pure-black canvas, uppercase display type, ghost pill buttons.

## 🔒 Security notes
- All authorization is enforced **server-side** by Postgres RLS policies — the client is never trusted.
- User input is HTML-escaped before rendering to prevent XSS.
- Length limits are enforced both client-side and by DB `CHECK` constraints.
- The `anon` key is public by design; your service-role key is **never** in this repo.
