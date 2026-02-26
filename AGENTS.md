# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

LearnFlow is an AI-powered learning platform with a client/server architecture:
- **Frontend**: React 19 + TypeScript + Vite (port 5173)
- **Backend**: Node.js + Express + TypeScript + Prisma ORM (port 3000)
- **Database**: PostgreSQL (port 5432)

### Running the services

Standard commands documented in `README.md` and `package.json`. Key points:

- **Backend**: `cd server && npm run dev` (uses `tsx watch` for hot-reload)
- **Frontend**: `cd client && npm run dev` (Vite dev server)
- **Lint**: `cd client && npm run lint` (ESLint; server has no dedicated lint script — use `npx tsc --noEmit` for type checks)
- **Tests**: `cd server && npm test` (Jest, currently no test files exist)
- **Build**: `cd client && npm run build` (tsc + vite build)

### Non-obvious caveats

1. **PostgreSQL must be running** before starting the backend. Start it with: `sudo pg_ctlcluster 16 main start`
2. **Prisma client must be generated** after installing server dependencies: `cd server && npx prisma generate`
3. **Database schema sync**: Use `cd server && npx prisma db push` to push schema to a fresh database (no migration files exist in the repo).
4. **Environment files** (`.env`) are gitignored. For local dev, create:
   - `server/.env` with `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=development`, `PORT=3000`
   - `client/.env` with `VITE_API_URL=http://localhost:3000/api`
   - See `server/env.example` and `client/env.example` for templates.
5. **Pre-existing lint/type errors**: The codebase has known ESLint errors (mostly `no-explicit-any`, unused vars) and TypeScript strict-mode errors in the server. The `tsx watch` dev server and Vite dev server both bypass strict type checking, so these don't block development.
6. **AI features are optional**: The `OPENROUTER_API_KEY` env var is optional. Without it, the server warns but all CRUD features (goals, tasks, check-ins) work normally. A fallback plan generator exists.
7. **No lockfiles**: The repository has no `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml` — use `npm install` in both `client/` and `server/`.
8. **Database credentials for local dev**: The `docker-compose.yml` uses `learnflow_user` / `learnflow_password` / `learnflow` as defaults. Match these in `server/.env` `DATABASE_URL`.
