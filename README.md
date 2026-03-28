# Diana

[![CI](https://github.com/louissullivan4/diana/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/louissullivan4/diana/actions/workflows/ci.yml) [![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/yngstew)

A plugin-based Discord bot platform. Plugins add slash commands, API routes, and background jobs - toggled on/off from a web dashboard.

**Bundled plugins:**

- **Diana** - League of Legends match tracking, rank monitoring, and summoner management
- **Pathfinder** - Apex Legends rank monitoring and player tracking

---

## Quick Start

```bash
cp .env.example .env   # fill in your tokens and DATABASE_URL
npm install
npm run build
npm run db:migrate
npm run user -- add <username> <password>
npm start
```

- API: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard` (build first with `npm run build:dashboard`)

See [docs/development.md](docs/development.md) for full setup, environment variables, plugin development, and deployment.
