# Diana Discord Bot — Setup & Testing Guide

## Overview

Diana is a League of Legends match tracking bot. This guide covers how to invite Diana to a Discord server, configure it, and run the test suite.

---

## Prerequisites

- Node.js 20+
- PostgreSQL database
- A Riot Games API key ([get one here](https://developer.riotgames.com))
- A Discord application with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the following:

| Variable                | Required | Description                                                       |
| ----------------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string                                      |
| `RIOT_API_KEY`          | Yes      | Riot Games API key                                                |
| `DISCORD_BOT_TOKEN`     | Yes      | Discord bot token                                                 |
| `DISCORD_CLIENT_ID`     | Yes      | Discord application/client ID                                     |
| `DISCORD_GUILD_ID`      | No       | Restrict slash command registration to one guild (faster for dev) |
| `DISCORD_CHANNEL_ID`    | No       | Dev fallback channel if no guilds have configured a channel       |
| `DISABLE_DISCORD_POSTS` | No       | Set to `true` to suppress all Discord notifications               |

---

## Inviting the Bot to a Discord Server

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and select your application.
2. Navigate to **OAuth2 → URL Generator**.
3. Select scopes: `bot`, `applications.commands`.
4. Select bot permissions: `Send Messages`, `Embed Links`, `View Channels`.
5. Copy the generated URL and open it in a browser to invite the bot to your server.

When the bot joins, it sends a welcome message explaining the setup steps.

---

## First-Time Server Setup

Once the bot is in your server, run these commands in Discord:

```
/setchannel #your-channel
```

Sets the channel where match notifications will be posted. Requires **Manage Channels** permission.

```
/add name:FM Stew tag:RATS region:EU_WEST
```

Adds a summoner to track. The bot looks up the Riot account and starts monitoring matches.

```
/help
```

Lists all available commands.

---

## Available Commands

| Command                           | Description                                       | Permission      |
| --------------------------------- | ------------------------------------------------- | --------------- |
| `/setchannel #channel`            | Set the notification channel                      | Manage Channels |
| `/add <name> <tag> [region]`      | Track a summoner in this server                   | Anyone          |
| `/remove <name> [tag]`            | Stop tracking a summoner                          | Anyone          |
| `/config live-posting true/false` | Enable or disable live match posts                | Manage Server   |
| `/config view`                    | View current bot settings for this server         | Manage Server   |
| `/summoner <name> [tag] [region]` | View a summoner's ranked profile and recent stats | Anyone          |
| `/champion-stats`                 | View champion statistics                          | Anyone          |
| `/inter-of-the-week`              | View the Inter of the Week rankings               | Anyone          |
| `/help`                           | Show command reference                            | Anyone          |

---

## Running the Database Migration

The migration adds the `guild_config` and `guild_summoners` tables required for multi-server support.

**Fresh install** — the `db/init/data.sql` init script already includes both tables.

**Existing database** — run the migration manually:

```bash
psql $DATABASE_URL -f db/migrations/002_guild_support.sql
```

---

## Running Tests

### Install dependencies

```bash
npm install
```

### Run all tests

```bash
npm test
```

### Run a specific test file

```bash
npm test -- --testPathPatterns guildService
```

### Run with coverage

```bash
npm run test:coverage
```

---

## Test Structure

Tests live in `/test`. Each file mirrors the module it tests:

| Test file                       | What it covers                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `guildService.test.ts`          | All guild DB operations — `guild_config` and `guild_summoners` CRUD                  |
| `setChannelCommand.test.ts`     | `/setchannel` — sets notification channel, guild guard                               |
| `addSummonerCommand.test.ts`    | `/add` — Riot API lookup, new vs existing summoner, duplicate handling, error cases  |
| `removeSummonerCommand.test.ts` | `/remove` — single/multiple match resolution, autocomplete, error handling           |
| `configCommand.test.ts`         | `/config live-posting` and `/config view` — enable/disable notifications, view embed |
| `helpCommand.test.ts`           | `/help` — embed structure, ephemeral reply                                           |
| `summonerService.test.ts`       | Summoner DB operations including guild-scoped autocomplete                           |

### Test patterns

- **Database layer**: `db.query` is mocked via `jest.mock('../packages/diana-core/src/plugins/diana-league-bot/api/utils/db')`. Tests assert SQL keywords (e.g. `expect.stringContaining('FROM guild_summoners')`) and parameters.
- **Discord commands**: `discord.js` and `diana-core` are mocked. Interaction objects are created inline with `jest.fn()` methods for `reply`, `editReply`, `deferReply`.
- **Isolation**: each `describe` block calls `jest.clearAllMocks()` in `beforeEach` to prevent state leakage between tests.

### Example: running just the guild-related tests

```bash
npm test -- --testPathPatterns "guildService|setChannelCommand|addSummonerCommand|removeSummonerCommand|configCommand|helpCommand"
```

---

## Multi-Server Isolation

Each Discord server (guild) has its own row in `guild_config` (notification channel, live posting toggle) and its own rows in `guild_summoners` (which summoners it tracks).

- Users in Server A can only add, remove, and configure summoners for Server A.
- A summoner (e.g. `FM Stew#RATS`) can be tracked by multiple servers simultaneously — each gets its own notifications to its own channel.
- Removing a summoner from one server does not affect other servers or delete the global summoner record.
