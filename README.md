# justrefine

Triage stakeholder requests the way a product owner actually works: capture asks fast,
prioritize them, run a focused refinement session one request at a time, and walk away
with clear outcomes and ready-to-send follow-ups.

**Live app:** https://refineflow.vercel.app/app

## Why

A PO leaves a meeting with a dozen asks scribbled across notes. justrefine turns that mess
into a clean pipeline — **Capture → Refine → Refined** — and produces concrete next steps
(user stories, handover/decline emails, clarification requests) plus a shareable summary.

## Features

- **Capture** — add requests with title, details, source, urgency, tags, and an optional deadline.
  Paste raw meeting notes and they auto-split into separate requests (with de-duplication).
- **Refine** — a Linear-style stacked card deck. Go through the queue one at a time; the active
  card swipes away on decision and the next promotes into focus. Sort by urgency or deadline.
  Full keyboard flow (`1`–`5` pick an action, `Enter` save, `S` skip, `Del` delete, `Esc` exit).
- **Per-action follow-ups** — each decision generates a concrete next step:
  - *Convert to user story* → role / want / benefit + acceptance criteria
  - *Refer to other team* → handover email draft
  - *Decline* → reason + a pre-filled email to the SPOC
  - *Needs more info* → clarification request
  - *Already done* → closed (with a small confetti easter egg 🎉)
- **Draft with AI** — optionally let AI draft the user story or the handover email from the
  request context. Runs server-side; the OpenAI key never reaches the browser.
- **Refined** — outcome counts, a one-click stakeholder summary, per-outcome copy, CSV export,
  and email summary. Reopen or delete any outcome.
- **Quality-of-life** — inline undo on save/delete, `C` to quick-capture, toasts, and auto-save
  to the browser (localStorage).

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- OpenAI Chat Completions (`gpt-4o-mini`) via server-side route handlers

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the triage app lives at `/app`.

### Environment

The AI drafting features need an OpenAI API key. Create `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

Without it, the app works fully — only the "Draft with AI" buttons are disabled.

## Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the dev server         |
| `npm run build` | Production build             |
| `npm run start` | Serve the production build   |
| `npm run lint`  | Lint with ESLint             |

## Project structure

```
src/
  app/
    page.tsx              Landing page
    app/page.tsx          The triage app (Capture / Refine / Refined)
    api/
      draft-story/        AI: draft a user story
      draft-email/        AI: draft a handover email
  components/             Inbox, RefinementMode, Refined, forms, badges, toasts
  lib/                    store, types, sorting, follow-ups, export, confetti
```

## Data & privacy

Requests are stored locally in your browser (localStorage) — nothing is sent to a server
except the request text you explicitly send to the AI drafting endpoints. If you use the AI
features with confidential data, review your OpenAI data-sharing settings first.

## Deployment

Deployed on [Vercel](https://vercel.com/). Set `OPENAI_API_KEY` as a project environment
variable to enable the AI features in production.
