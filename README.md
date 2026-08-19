# Limit Lab

A real-time backend traffic simulation lab for experimenting with caching and rate limiting. Generate configurable traffic against a live gateway and watch how different rate-limiting algorithms and Redis caching affect throughput, latency, and rejection rates — in real time, on a live dashboard.

See [`server/README.md`](./server/README.md) and [`client/Dashboard/README.md`](./client/Dashboard/README.md) for a full breakdown of how each part of the system works and why it's built the way it is. This document is just installation and what's planned next.

## Architecture at a glance

```
Dashboard (React)  <--sockets/REST-->  Gateway  --->  Rate Limiter  --->  Cache  --->  Backend
                                           ^
                                           |
                                    Traffic Generator
```

Five independent pieces: `backend` (the "expensive" service being protected), `gateway` (the front door — hosts rate-limiter and cache as in-process middleware), `traffic-generator` (fires configurable simulated traffic), `database` (shared Redis connection), and the `client/Dashboard` frontend. Full detail in the service-level READMEs linked above.

See [`./ARCHITECTURE.md`](./ARCHITECTURE.md) for a full breakdown of the project architecture.

## Prerequisites

- Node.js 20+
- npm
- Redis (either installed locally, or run via Docker — see below)
- Docker + Docker Compose, only if using the Docker install path

---

## Option A — Manual install (multiple terminals)

This runs every service as its own local process. Good for active development, since each service supports hot-reload independently.

### 1. Clone and install dependencies

```bash
git clone <https://github.com/Tanish5K/LimitLab.git>
cd LimitLab

cd server
npm install

cd ../client/Dashboard
npm install
```

### 2. Start Redis

If you don't already have Redis running locally:
```bash
docker run -d --name limitlab-redis -p 6379:6379 redis:8-alpine
```
Or install and run Redis natively for your OS if you'd rather not use Docker at all.  
Note: Redis version may change. 

### 3. Configure environment variables

Create `server/.env` (refer to .env.example):
```env
PORT=3000
BACKEND_PORT=4000
TRAFFIC_GEN_PORT=5000
REDIS_URL=redis://localhost:6379
BACKEND_URL=http://localhost:4000
CLIENT_URL=http://localhost:5173
```

Create `client/Dashboard/.env` (refer to .env.example):
```env
VITE_SERVER_URL=http://localhost:3000
VITE_TRAFFIC_GEN_URL=http://localhost:5000
VITE_BACKEND_URL=http://localhost:4000
```

### 4. Run every service, each in its own terminal

```bash
# terminal 1 — dummy backend
cd server
npm run dev:backend

# terminal 2 — gateway (rate limiter + cache + proxy)
cd server
npm run dev

# terminal 3 — traffic generator
cd server
npm run dev:traffic

# terminal 4 — dashboard
cd client/Dashboard
npm run dev
```

Confirm each terminal prints its "running on port ___" line before moving to the next. Once all four are up, open the dashboard (default `http://localhost:5173`) — the header should show both `gateway` and `traffic-gen` as connected.

---

## Option B — Docker

`server/Dockerfile`, `client/Dashboard/Dockerfile`, and the root `docker-compose.yml` build and run all five services (Redis, backend, gateway, traffic-generator, dashboard) together.

A couple of things worth understanding about the environment values set in `docker-compose.yml`, in case you edit it later: services talking to each other *inside* the Docker network (gateway → Redis, gateway → backend, traffic-generator → gateway) use the Compose **service names** (`redis`, `backend`, `gateway`) instead of `localhost`, since each container has its own isolated `localhost`. The dashboard's `VITE_*` variables stay as `localhost` with the *published* ports, because those requests come from your browser on the host machine, not from inside a container.

### Running it

```bash
docker compose up --build
```

First run builds all four images, which takes a few minutes; subsequent runs are fast unless `package.json` or source files changed. Dashboard will be available at `http://localhost:4173`. Stop everything with `docker compose down`; add `-v` if you also want to drop the Redis container's data volume.

---

## Roadmap — planned work

### Bring-your-own-database mode

Currently, `backend/` is a fake service that just sleeps and returns dummy payloads — a stand-in for "some expensive operation." The planned next step is letting a user point Limit Lab at **their own real database or API**, so the tool can be used to test actual rate-limiting and caching configurations against real infrastructure, not just a simulated one.

Rough shape of what this needs, for future reference:
- A configurable backend target (URL, and possibly auth headers) instead of the hardcoded `BACKEND_URL` pointing only at the dummy service
- The dashboard's job config form would need a way to specify "use my own endpoint" vs. "use the built-in simulated backend," likely as an additional field alongside the existing traffic/algorithm/cache config
- Caching would need to be aware that a real backend's responses may not always be safe to cache blindly (real APIs can have side effects, non-idempotent routes, or data that shouldn't be cached at all) — this probably needs an explicit opt-in per job, not a global assumption
- Latency and error handling in the gateway's proxy route currently assume the dummy backend's simple, always-JSON, always-200-or-clean-error behavior; a real external service needs more defensive handling (timeouts, non-JSON responses, arbitrary status codes)

### Other ideas, less immediate

- Per-user/per-session isolated rate-limiter and cache configuration, instead of one shared global config (see the "why config is global" note in `server/README.md` for the current trade-off and why this would be a real architectural change, not a small one)
- Persisted job history that survives a page reload/server restart, instead of everything living only in in-memory stores and React state
- Exporting a completed run's full metrics (allowed/rejected/latency/cache stats) as JSON or CSV for later comparison
- A saved "experiment comparison" view — running the same traffic config against multiple algorithm/cache combinations back to back and viewing results side by side (this was part of the original project scope, not yet built)