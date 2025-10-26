# Diana - League of Legends Tracker Application and Bot

## Status

[![Diana Pipeline](https://github.com/louissullivan4/diana/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/louissullivan4/diana/actions/workflows/ci.yml)

## Overview

Diana is service paired with a Discord bot to track League of Legends players. It ingests match data from the Riot API, persists it to PostgreSQL, and pushes rich embed notifications back to Discord as games finish or a player’s rank changes. Slash commands expose on-demand summaries, while a cron-driven watcher keeps the database and Discord in sync.

## Architecture Highlights

- **Discord bot (`src/discord`)** – Manages client login, command registration, embeds, and outbound notifications. Slash commands are defined in `src/discord/commands`.
- **Match monitoring (`src/discord/matchMonitoringService.ts`)** – Cron job that polls Riot for fresh matches, stores summaries, updates rank data, and sends match/rank notifications.
- **Express API (`src/api`)** – REST endpoints for summoner profiles, match details, and timelines backed by PostgreSQL via `pg`.
- **Riot integration layer (`src/api/utils/lolService`)** – Wraps the `twisted` SDK with a factory that swaps between live Riot API access and deterministic JSON fixtures.
- **Data helpers** – Data Dragon utilities resolve champion, queue, and role metadata; rank utilities compute LP deltas and promotion/demotion events.
- **Database assets (`db/`)** – SQL bootstrap scripts define `summoners`, `match_details`, and `match_timeline` tables plus seed data for monitored players.

## Features

- Discord slash commands: `/ping`, `/iotw` (Inter of the Week leaderboard), and `/summoner` (weekly performance + live rank recap).
- Automatic match polling every 20 seconds for tracked summoners with Discord notifications for match results and rank changes.
- Historical match persistence and timeline storage with JSON payloads for later analysis.
- Summoner search endpoints with autocomplete that surfaces stored game names and taglines directly in Discord.
- Local development toggle (`USE_RIOT_API=false`) that switches the bot and API to deterministic mock data for offline testing.
- Jest-based test harness (see `test/discordService.test.js`) covering notification flows and reusable embed builders.

## Planned Future Work

- Track Ranked Flex queue progress alongside the existing Ranked Solo/Duo monitoring, including LP delta calculations and embeds.
- Normalise timeline REST routes so they map to the correct handlers and return data instead of mutating by mistake.
- Extend automated tests to cover slash-command execution paths and match aggregation edge cases.
- Add operational tooling (health checks, structured logging, metrics) to better observe long-running match monitoring processes.
