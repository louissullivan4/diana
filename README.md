# Diana – Plugin-based Discord Bot

## Status

[![Diana Pipeline](https://github.com/louissullivan4/diana/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/louissullivan4/diana/actions/workflows/ci.yml)

## Overview

Diana is an overarching Discord bot that runs **plugins** you develop. Each plugin can add slash commands, HTTP API routes, and background jobs (cron). Plugins can be turned on and off and configured from a **UI dashboard**.

The first plugin is **diana-league-bot**: League of Legends match tracking, summoner info, champion stats, and Inter of the Week. All League-related code lives under `src/plugins/diana-league-bot/`, keeping a clear separation between the plugin manager (core) and the League plugin.

---

## Setup

### Prerequisites

- **Node.js** 18+ (project uses 24.x in CI)
- **PostgreSQL** (for diana-league-bot: summoners, match_details, rank_tracking)
- **Discord application** (Bot token and Client ID from [Discord Developer Portal](https://discord.com/developers/applications))

### Environment

1. Copy `.env.example` to `.env` (create one if missing).
2. Set at least:
    - `DISCORD_BOT_TOKEN` – Bot token from Discord Developer Portal
    - `DISCORD_CLIENT_ID` – Application (client) ID
    - `DATABASE_URL` – PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/diana`)
3. Optional:
    - `DISCORD_GUILD_ID` – Limit slash command registration to one server (faster during dev)
    - `DISCORD_CHANNEL_ID` – Default channel for match/rank notifications
    - `USE_RIOT_API=true` and `RIOT_API_KEY` – Use live Riot API; if unset, diana-league-bot uses mock data
    - `PORT` – HTTP server port (default `3000`)
    - `DIANA_CONFIG_DIR` – Directory for `plugins.json` (default `./data`)

### Database (for diana-league-bot)

Run the init SQL so the League plugin has tables and (optionally) seed summoners:

```bash
psql -U postgres -d diana -f db/init/data.sql
```

Or use Docker:

```bash
docker compose up -d postgres
```

Then run the SQL above against the container.

### Authentication Setup

1. Run the users table migration:

```bash
psql -U postgres -d diana -f db/migrations/001_add_users_table.sql
```

2. Set the JWT secret in your `.env` file:

```
JWT_SECRET=your-secure-random-secret-here
```

3. Create your first user:

```bash
npm run user -- add <username> <password>
```

### User Management

The `npm run user` script provides commands to manage dashboard users:

```bash
# Add a new user
npm run user -- add <username> <password>

# List all users
npm run user -- list

# Change a user's password
npm run user -- passwd <username> <new-password>

# Delete a user
npm run user -- delete <username>
```

**Notes:**

- Passwords must be at least 8 characters
- Usernames must be unique
- Sessions last 30 days

### First run

```bash
npm install
npm run build
npm start
```

Or for development with hot reload:

```bash
npm run dev
```

- API: **http://localhost:3000**
- Health: **http://localhost:3000/api/health**
- Dashboard: build with `npm run build:dashboard`, then open **http://localhost:3000/dashboard**

---

## Creating a New Plugin

### 1. Plugin contract

Implement the `DianaPlugin` interface from `src/core/pluginTypes.ts`:

- **id** – Unique string (e.g. `my-plugin`)
- **name** – Display name
- **version** – Semantic version
- **description** – Optional short description
- **onLoad(context)** – Required. Register commands, routes, and any one-off setup.
- **onEnable(context)** – Optional. Start background work (e.g. cron).
- **onDisable(context)** – Optional. Stop background work and clean up.

`PluginContext` gives you:

- `registerSlashCommands(commands)` – Add Discord slash commands
- `mountRouter(path, router)` – Mount an Express router (e.g. `/my-api`)
- `registerCron(schedule, handler)` – Run `handler` on a cron schedule (returns a cleanup function)
- `getConfig<T>()` – Read plugin-specific config (from dashboard / `data/plugins.json`)
- `getDiscordClient()` – Access the shared Discord client (e.g. to send messages)

### 2. Add your plugin folder

Create a folder under `src/plugins/`, for example:

```
src/plugins/my-plugin/
  index.ts          # Plugin entry: export a DianaPlugin
  commands/         # Optional: slash commands
  api/              # Optional: Express routes
```

### 3. Implement the plugin entry

Example `src/plugins/my-plugin/index.ts`:

```ts
import type { DianaPlugin } from '../../core/pluginTypes';
import { myRouter } from './api/routes';
import { mySlashCommand } from './commands/myCommand';

export const myPlugin: DianaPlugin = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Does something useful.',

    async onLoad(context) {
        context.registerSlashCommands([mySlashCommand]);
        context.mountRouter('/my-api', myRouter);
    },

    async onEnable(context) {
        context.registerCron('*/5 * * * * *', async () => {
            console.log('My plugin cron tick');
        });
    },
};
```

Slash commands must match the `SlashCommand` type in `src/core/pluginTypes.ts` (Discord.js builder + `execute` + optional `autocomplete`).

### 4. Register the plugin in core

In `src/core/index.ts`, after other plugins:

```ts
const { myPlugin } = await import('../plugins/my-plugin');
registerPlugin(myPlugin);
await loadPlugin(myPlugin.id);
```

### 5. Enable/disable from dashboard

Plugin state is stored in `data/plugins.json` (or `DIANA_CONFIG_DIR`). Use the dashboard at **/dashboard** to enable or disable your plugin; when disabled, its cron jobs stop (slash commands remain until restart).

### Reference

- **Plugin types**: `src/core/pluginTypes.ts`
- **Example plugin**: `src/plugins/diana-league-bot/` (League API, Discord commands, cron, config)

---

## Deployment

### Production run

```bash
npm run build
npm run build:dashboard   # Optional: serve UI at /dashboard
npm start
```

Set `NODE_ENV=production` and ensure all required env vars are set (no `.env` in repo).

### Docker

The Dockerfile builds and runs Diana (core + plugins). Default command runs the compiled app:

```bash
docker build -t diana .
docker run --env-file .env -p 3000:3000 diana
```

- **Port**: Container exposes `3000`; override with `PORT` in env.
- **Database**: Point `DATABASE_URL` at your Postgres instance (e.g. host network or external DB).
- **Dashboard**: To serve the dashboard from the same process, build the dashboard and copy `dashboard/dist` into the image, or serve it from a separate static host and point users to it.

### Environment summary

| Variable             | Required                | Description                            |
| -------------------- | ----------------------- | -------------------------------------- |
| `DISCORD_BOT_TOKEN`  | Yes                     | Discord bot token                      |
| `DISCORD_CLIENT_ID`  | Yes                     | Discord application ID                 |
| `DATABASE_URL`       | Yes (for League plugin) | PostgreSQL connection string           |
| `JWT_SECRET`         | Yes (for dashboard)     | Secret key for JWT token signing       |
| `DISCORD_GUILD_ID`   | No                      | Restrict slash commands to one server  |
| `DISCORD_CHANNEL_ID` | No                      | Default notification channel           |
| `USE_RIOT_API`       | No                      | `true` to use Riot API (League plugin) |
| `RIOT_API_KEY`       | If `USE_RIOT_API=true`  | Riot API key                           |
| `PORT`               | No                      | HTTP port (default 3000)               |
| `DIANA_CONFIG_DIR`   | No                      | Dir for plugins.json (default ./data)  |

---

## Architecture

- **Core (`src/core`)** – Single Discord client, Express server (API + optional dashboard), plugin registry, plugin config store (`data/plugins.json`). Registers core slash command (e.g. `/ping`) and loads plugins.
- **Dashboard (`dashboard/`)** – Vite + React app; build output served at `/dashboard` to list plugins and toggle them on/off.
- **Plugins (`src/plugins/`)** – Each plugin is self-contained (e.g. **diana-league-bot**: api, discord commands, cron, config, types). Core only imports the plugin entry and calls `onLoad` / `onEnable` / `onDisable`.
- **Database (`db/`)** – Init SQL for League plugin (summoners, match_details, rank_tracking, etc.).

---

## Scripts

| Script                     | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `npm run dev`              | Run Diana with hot reload (ts-node + nodemon)               |
| `npm run build`            | Compile TypeScript to `dist/`                               |
| `npm run build:dashboard`  | Install deps and build dashboard to `dashboard/dist`        |
| `npm start`                | Run compiled Diana (`dist/core/index.js`)                   |
| `npm run test`             | Run Jest tests                                              |
| `npm run user`             | Manage dashboard users (add/list/delete/passwd)             |
| `npm run backfill:matches` | League plugin: backfill missing matches (requires Riot API) |

---

## Features (diana-league-bot)

- Slash commands: `/iotw`, `/summoner`, `/champion` (plus core `/ping`)
- Match polling every 20s for tracked summoners; Discord notifications for match end and rank changes
- REST API: `/summoners`, `/match` (see plugin routes)
- Local dev: `USE_RIOT_API=false` uses mock Riot data from `db/data/riot/`

---

## UI Improvements TODO

### Priority 1 - Core UX (In Progress)

- [x] **React Router & Navigation** - Add proper routing for multi-page dashboard
- [x] **404 Error Page** - Show friendly error screen with "Back to Dashboard" button for unknown routes
- [x] **502 Server Error Page** - Show connection error screen with retry button when backend is unreachable
- [x] **Loading Screen** - Animated Moo Cow loading screen
- [x] **Tracked Summoners List View** - Show existing summoners in a nice card list when opening League Bot config
- [x] **Toast Notifications** - Success/error feedback for user actions

### Priority 2 - Polish & Features

- [ ] **Sidebar Navigation** - Add collapsible sidebar for better navigation
- [ ] **Plugin Details Page** - Expandable/dedicated view for plugin information
- [ ] **Search & Filter** - Filter plugins by name/status
- [ ] **Confirmation Dialogs** - Add confirmation for destructive actions (disable plugin, remove summoner)
- [ ] **Dark/Light Mode Toggle** - Theme switcher with system preference detection
- [ ] **Responsive Mobile Design** - Mobile-friendly layout

### Priority 3 - Authentication & Security

- [x] **Authentication System** - Login requirement to access dashboard
    - **User Type**: All regular users (no admin/user role distinction)
    - **Auth Method**: Username/password login
    - **Session Duration**: 1 month (30-day JWT tokens)
    - Backend: JWT-based auth with httpOnly cookies
    - Database: Users table with bcrypt-hashed passwords
    - Frontend: Login page, protected routes, logout functionality

### Priority 4 - Advanced Features

- [ ] **Activity Logs** - Show plugin enable/disable history
- [ ] **Keyboard Shortcuts** - Quick actions via keyboard
- [ ] **Plugin Marketplace** - Browse and install new plugins
- [ ] **Real-time Updates** - WebSocket for live plugin state updates

---

## Implementation Progress

**Last Updated:** 2026-02-02

**Status:** Priority 1 items implemented

### Completed

- **React Router** - Added `react-router-dom` with proper routing structure
- **404 Error Page** - Error page with Moo Cow and "Back to Dashboard" button
- **502 Server Error Page** - Connection error page with Moo Cow, helpful tips, and "Retry Connection" button
- **Loading Screen** - Animated Moo Cow loading screen
- **Toast Notifications** - Success/error/warning/info toasts with slide-in animation and auto-dismiss
- **Tracked Summoners List** - Shows existing summoners in card format when opening League Bot config
- **Authentication System** - Login page, JWT auth, 30-day sessions, logout button
- **User Management Script** - CLI tool to add/list/delete users and change passwords

### New Files Created

**Dashboard:**

- `dashboard/src/components/LoadingScreen.tsx` + CSS
- `dashboard/src/components/LoginPage.tsx` + CSS
- `dashboard/src/components/NotFoundPage.tsx` + CSS
- `dashboard/src/components/ServerErrorPage.tsx` + CSS
- `dashboard/src/components/Toast.tsx` + CSS
- `dashboard/src/components/SummonerListView.tsx` + CSS

**Backend:**

- `src/core/auth/authService.ts` - JWT auth, user CRUD, password hashing
- `src/core/auth/authMiddleware.ts` - Express middleware for protected routes
- `src/core/api/authApi.ts` - Login/logout/me endpoints
- `src/scripts/addUser.ts` - User management CLI script
- `db/migrations/001_add_users_table.sql` - Users table migration

---

## Planned

- Per-plugin config UI in the dashboard
- More plugins using the same `DianaPlugin` contract
