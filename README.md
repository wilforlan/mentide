# Mentide

Local Electron note app for journaling and thinking.

## Vision

A calm, offline place to journal and think — write daily, grow ideas into linked notes, and see how they connect — without accounts or the cloud.

## Mission

Give people a warm, local workspace for psychological health: daily notes and freeform notes, wiki-links that form a graph, a graph view, and edit history. Everything stays on the machine in SQLite. Local profiles, soft-delete, and an item hub with backlinks and mentions keep the practice personal and recoverable.

On the daily note canvas, overscroll at the edges moves through time: scroll up into newer days, scroll down into older days. Missing days are created as you enter them.

## Why it was built

Most note tools push accounts, sync, and distraction. Mentide was built for the opposite: a private, glossy light UI for sitting with thoughts, linking them over time, and understanding the shape of what you care about — with no login and no network required.

## Stack

- Electron + React + TypeScript + Vite
- Tailwind CSS + shadcn-style UI
- SQLite (`better-sqlite3`)
- TipTap editor
- React Flow graph

## Develop

```bash
npm install
npm test
npm run dev
```

## Scripts

- `npm run dev` — Electron app
- `npm test` — Vitest behavior tests
- `npm run typecheck` — TypeScript
- `npm run build` — production build
- `npm run dist:dmg` — build a macOS `.dmg` installer into `release/`

## macOS installer

```bash
npm run dist:dmg
```

The signed-unsigned DMG lands in `release/` (for example `Mentide-0.2.0-arm64.dmg`). Open it and drag **Mentide** into Applications.

App icon assets live in `build/icon.icns` and `build/icon.png`.
