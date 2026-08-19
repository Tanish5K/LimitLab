# Limit Lab — `server/`

This document explains how the backend is put together and, more importantly, *why* it's put together this way. Installation and running instructions live in the root README — this is the "understand the codebase" document, written for me (or anyone picking this project back up later) to re-orient quickly.

## Why five separate things instead of one Express app

It would have been possible to build this as a single Express server with everything crammed into one `index.ts`. I deliberately didn't, because the whole point of Limit Lab is to *observe* how independent pieces of infrastructure affect each other — traffic generation, rate limiting, caching, and the backend itself all needed to behave like genuinely separate systems, not like functions calling each other in the same file. That separation is what makes it possible to answer questions like "what happens to backend load specifically when I flip caching on" — the answer only means something if backend load is being measured independently of the thing changing it.

So the backend is five things:

```
server/
  database/          -- shared Redis connection, nothing else
  backend/            -- the "expensive" dummy service being protected
  gateway/            -- the front door: proxies, wires everything together, hosts the sockets
  rate-limiter/       -- Express middleware, four swappable algorithms
  cache/               -- Express middleware, Redis-backed response caching
  traffic-generator/  -- its own service, fires real HTTP traffic at the gateway
```

Three of these (`gateway`, `backend`, `traffic-generator`) are **separate running processes** with their own `listen()` calls. Two of these (`rate-limiter`, `cache`) are **not** separate processes — they're middleware modules that the gateway imports and runs *in-process*. That distinction matters enough that it's worth explaining up front.

## Why rate-limiter and cache are middleware, not services

Traffic-generator works as an independent process because its job is to fire outbound requests — nothing needs to intercept them mid-flight, so there's no cost to it running elsewhere and just making HTTP calls over the network.

Rate limiting and caching are fundamentally different: they have to sit **synchronously in the request path**, deciding "let this through" or "reject/serve-from-cache" before the request reaches the backend. If these were separate services, every single request would need an extra network round-trip just to ask "can this proceed?" — that would add latency to the exact thing this project is trying to measure accurately. So instead, `rate-limiter` and `cache` are built as importable Express middleware that the gateway mounts directly onto its own request pipeline:

```ts
// gateway/index.ts
app.use("/resource", rateLimiterMiddleware);
app.use("/resource", cacheMiddleware);
app.get("/resource/:id", async (req, res) => { /* proxy to backend */ });
```

Order matters here, and it's deliberate: rate limiter runs **before** cache. A request that gets rejected by the rate limiter never touches the cache layer at all — which keeps cache hit/miss metrics honest (they only reflect requests that were actually allowed through), and matches how a real system would be laid out (you don't want to spend cache-lookup cost on traffic you're about to reject anyway).

## Request lifecycle, end to end

Tracing a single `GET /resource/1` through the whole system, in order:

1. **Traffic Generator** fires the request (`engine.ts`'s tick loop → `fireRequest()`), tagging it with a simulated `x-client-id` header and starting a latency timer.
2. **Gateway** receives it at `/resource/:id`.
3. **Rate Limiter middleware** runs first. It looks up (or creates) state for that `clientId` in whichever algorithm is currently active, decides allow/reject, and records the outcome in `metricStore`. A reject short-circuits here with a `429` — nothing past this point runs.
4. **Cache middleware** runs next, only if the request was allowed. It checks Redis for a cached response keyed on the request path. A hit returns immediately, records a cache "hit" event, and the request never reaches the backend at all. A miss records a "miss," then patches `res.json` so that whatever the backend eventually returns gets written into Redis with a TTL before being sent to the client.
5. **Backend proxy route** (still in `gateway/index.ts`) forwards the request to the dummy **Backend** service, waits for its (artificially delayed) response, records latency, and returns the result — through the patched `res.json`, so the cache middleware's write-back actually happens.
6. **Backend** (`backend/`) does `await sleep(randomLatency)` and returns fake payload data — this is standing in for "an expensive database call."
7. Every stage along the way emits data into an in-memory store (`metricStore`, `cacheStore`, `latencyStore`), which the **metrics aggregator** reads on a fixed interval and broadcasts to the dashboard over Socket.io.

## `database/`

```
database/
  redisClient.ts
```

One file, one job: create the Redis client, connect it, and export it so every other module (`cache/`, mainly) imports the *same* connection instead of each creating its own.

```ts
export const redisClient = createClient({ url: redisUrl });
export async function connectRedis() { ... }
```

This was originally created inline inside the gateway's `index.ts`. I pulled it out into its own file because `gateway/index.ts` has side effects (`httpServer.listen(...)`) — importing `redisClient` directly from that file would have meant importing and re-running the entire gateway boot sequence just to get a database handle. Isolating side-effect-free exports (the client) from side-effect-having files (the gateway's entry point) is a pattern I ended up applying more than once in this codebase — same reasoning shows up again with `gateway/lib/socket.ts` below.

## `backend/`

The stand-in for a real, expensive downstream service — a database call, a slow third-party API, whatever. Deliberately dumb:

```ts
app.get("/resource/:id", async (req, res) => {
  const latency = req.query.latency ? Number(req.query.latency) : randomLatency();
  await sleep(latency);
  res.json({ id, data: `payload-for-resource-${id}`, latencyMs: latency, timestamp });
});
```

Latency is configurable per-request via `?latency=`, falling back to a random 20–200ms range. This matters for testing — a fixed latency would make every chart look identical regardless of what's actually being tested; randomized latency means the "avg latency" numbers in the dashboard are measuring something real rather than a constant.

## `gateway/`

```
gateway/
  index.ts               -- the actual Express app + Socket.io server + boot sequence
  lib/
    latencyStore.ts       -- records every request's latency (cache hits AND backend calls)
    metricsAggregator.ts  -- the 250ms tick that turns raw stores into socket broadcasts
    socket.ts             -- exposes the io instance to other modules without circular imports
```

This is the front door and also the orchestrator — it's the one file that knows about every other module (`rate-limiter`, `cache`, `database`) and wires them together. Everything else in this codebase is built to be imported *by* the gateway; the gateway itself isn't imported by anything.

**`latencyStore.ts`** exists because "average latency" needed to reflect *both* cache hits (fast, served from Redis) and cache misses (slow, hit the real backend) — a single number that blends both is what actually demonstrates caching's effect, rather than two disconnected numbers.

**`metricsAggregator.ts`** is the piece that turns "a bunch of counters sitting in memory" into "a live-updating dashboard." Every 250ms it:
- reads the current totals from `rate-limiter`'s and `cache`'s stores
- computes ratios (allowed/total, hit rate) and short-window deltas (how much changed *since the last tick*, for a "requests/sec right now" feel)
- reads whichever rate-limiting algorithm is currently active and pulls its live internal state (token levels, queue depth, or window counts — see the rate-limiter section)
- broadcasts all of it as one `"metrics"` socket event

I went back and forth on whether this store should emit only cumulative totals or only deltas — see **Design Decisions** below for why it ended up doing both.

**`socket.ts`** exists for the same reason `redisClient.ts` got pulled out of the gateway: other modules (like `rate-limiter/routes.ts`, if it ever needs to broadcast a config change) need access to the live `io` instance without importing `gateway/index.ts` itself and triggering its boot sequence. `setIoInstance`/`getIoInstance` is a tiny module-level singleton that solves that.

## `rate-limiter/`

```
rate-limiter/
  lib/
    types.ts
    config.ts               -- mutable, in-memory, single global config
    metricStore.ts            -- allowed/rejected/queued counters
    tokenBucket.ts
    leakyBucket.ts
    slidingWindowLog.ts
    slidingWindowCounter.ts
  routes/
    rateLimiterRoutes.ts     -- GET/POST /config, GET /metrics, POST /metrics/reset
  src/
    index.ts                 -- exports rateLimiterMiddleware + rateLimiterRoutes
```

**Config is a single global, mutable object** (`getConfig()`/`updateConfig()` in `lib/config.ts`), not passed as a parameter. This was a deliberate choice, not an oversight: the whole point is being able to flip the active algorithm from the dashboard *while the gateway is running*, without restarting it. `rateLimiterMiddleware` re-reads the current config on every single request rather than capturing it once at startup:

```ts
export function rateLimiterMiddleware(req, res, next) {
  const middleware = resolveMiddleware(); // reads getConfig() fresh, every request
  middleware(req, res, next);
}
```

The trade-off, worth being explicit about: this config is genuinely global across every client hitting the gateway. There's no per-user isolation — if the dashboard switches to leaky bucket, *everyone's* traffic is now going through leaky bucket. For a single-operator lab tool that's the right trade-off (simplicity, and it matches how one shared piece of infrastructure actually behaves). It would need real architectural changes — per-session config, per-session state maps — to safely support multiple simultaneous users with independent settings. Documented here so future-me doesn't "fix" this by accident without realizing it's a deliberate scope boundary.

### The four algorithms

Each algorithm is its own file, each keeps its state in a module-level `Map` keyed by `clientId` (from the `x-client-id` header traffic-gen attaches), so different simulated clients are tracked completely independently.

**Token Bucket** — each client has a `{ tokens, lastRefill, capacity }` bucket. Refill is *lazy*, not timer-driven: on each request, it computes how much time has passed since the last refill and adds tokens proportionally, capped at capacity.
```ts
const elapsedSec = (now - bucket.lastRefill) / 1000;
bucket.tokens = Math.min(config.capacity, bucket.tokens + elapsedSec * config.refillRatePerSec);
```
Lazy refill instead of a `setInterval` per client avoids needing a running timer per client that has to be cleaned up — the bucket just "catches up" whenever it's next touched.

One bug worth documenting because it cost real debugging time: `bucket.capacity` originally was only set once, at bucket creation. If a client's bucket was created under an old config and the algorithm's settings changed later, the *live enforcement* logic was already reading the current config correctly, but the *displayed* capacity (used for the dashboard's gauge) was stale — showing things like `18/5` instead of a sane fraction. Fixed by re-syncing `bucket.capacity = config.capacity` on every request, not just at creation.

**Leaky Bucket** — each client gets an actual `queue: Array<() => void>` plus a `setInterval` that drains one queued request at a time at a fixed rate. Requests beyond `capacity` get rejected outright; everything else waits its turn.

**Sliding Window (log mode)** — stores every raw request timestamp per client in an array, filters out anything older than the window on each check. Exact, but memory grows with request volume.

**Sliding Window (counter mode)** — doesn't store individual timestamps at all, just two numbers (`currentCount`, `previousCount`) and a window boundary. Estimates the "true" count by weighting the previous window's count by how much it still overlaps the current window:
```ts
const overlapWeight = 1 - elapsedInCurrent / windowMs;
const estimate = previousCount * overlapWeight + currentCount;
```
This is why the dashboard's live-state view labels this mode's number an **estimate**, while log mode's is labeled an exact **count** — they're genuinely different precision, not just a naming choice.

### Live algorithm state exports

Beyond deciding allow/reject, each algorithm file exports a read-only snapshot function the aggregator can poll:
```ts
getTokenLevels()       // tokenBucket.ts   -> per-client tokens/capacity
getTotalQueueDepth()   // leakyBucket.ts   -> current queue size, not lifetime queued count
getWindowCounts()      // slidingWindowLog.ts
getWindowEstimates()   // slidingWindowCounter.ts
```
These exist purely so the dashboard can show *live internal state* — "how full is this client's bucket right now" — not just the allow/reject outcome. `getTotalQueueDepth()` in particular is intentionally separate from `metricStore`'s `queued` counter: one is "how many are waiting right now" (goes up and down), the other is "how many times, ever, has a request been queued" (only goes up). Conflating those would have made the leaky bucket chart meaningless.

## `cache/`

```
cache/
  lib/
    types.ts
    config.ts        -- enabled/ttlSeconds, same mutable-global pattern as rate-limiter
    cacheStore.ts     -- hit/miss counters
  routes/
    cacheRoutes.ts   -- GET/POST /config, GET /metrics, POST /metrics/reset, POST /invalidate
  src/
    index.ts          -- exports cacheMiddleware + cacheRoutes
```

The cache key is the request's full path (`cache:${req.originalUrl}`), so `/resource/1` and `/resource/1?latency=50` are cached separately — deliberate, since a different query string is arguably a different request.

The one non-obvious trick in `cacheMiddleware`: on a cache miss, the response body doesn't exist yet — the route handler downstream is what generates it. Rather than caching before there's anything to cache, the middleware temporarily overrides `res.json` so that *whatever* the eventual handler sends gets written to Redis via `SETEX` (for TTL) on its way out, without the route handler needing to know caching exists at all:
```ts
const originalJson = res.json.bind(res);
res.json = (body) => {
  redisClient.setEx(key, config.ttlSeconds, JSON.stringify(body));
  return originalJson({ ...body, cacheHit: false });
};
```

**Known, documented, and accepted quirk:** under concurrent load, the *very first* burst of identical requests can produce more than one cache miss, not exactly one. If two requests for the same uncached key arrive close enough together, both check Redis before either has finished writing back — both see a miss, both hit the backend. This is the classic "thundering herd" / cache stampede problem. I chose not to solve it (e.g. with a request-coalescing lock) because reproducing it live is actually a useful, real thing to observe in a lab tool built around demonstrating caching concepts — it's left in intentionally, not an oversight.

## `traffic-generator/`

```
traffic-generator/
  lib/
    types.ts       -- TrafficConfig, JobState
    jobStore.ts     -- in-memory Map<jobId, JobState>
    engine.ts       -- the tick loop, pattern math, per-request firing + socket emission
  src/
    index.ts         -- its own Express app, its own Socket.io server, port 5000
```

This is a genuinely separate process (own `listen()`, own port) because, unlike rate limiting and caching, generating outbound traffic doesn't need to sit inline in anyone else's request path — it's just making its own HTTP calls, so there's no latency cost to it living elsewhere.

**The tick loop** (`engine.ts`) is the core of this module. Rather than "send N requests, sleep 1 second, repeat" (which would produce visibly steppy, unrealistic traffic), it runs every `TICK_MS` (100ms) and asks "what should the instantaneous rate be right now" via `rpsAtTime()`, which differs per pattern:
```ts
if (pattern === "ramp-up") {
  const progress = Math.min(elapsedSeconds / durationSeconds, 1);
  return Math.round(rps * progress);
}
```
Converting a target rate into "how many requests fire *this specific tick*" needed one more refinement: naive rounding (`Math.round(targetRps * TICK_MS / 1000)`) meant any target under ~5 RPS rounded to zero every tick — producing silence followed by a sudden jump instead of a smooth ramp. Fixed by carrying fractional "debt" between ticks:
```ts
const requestsDue = carry + (targetRps * TICK_MS) / 1000;
const requestsThisTick = Math.floor(requestsDue);
carry = requestsDue - requestsThisTick;
```
This is a small thing that mattered a lot for making "ramp-up" actually look like a ramp on the dashboard instead of a step function.

**Per-request events**, not just per-tick logs, are pushed live over this service's own Socket.io connection:
```ts
io?.emit("request-event", { timestamp, jobId, clientId, resourceId, status, cacheStatus, durationMs });
```
This is deliberately a *separate* socket connection from the gateway's `"metrics"` broadcast (see the client README for the reasoning) — the gateway's feed is aggregate/rolled-up, this feed is one event per real request, which is what powers the dashboard's live request table and lets the frontend compute its own instant-rate numbers from raw data instead of a pre-smoothed server-side rate.

**Job lifecycle** is tracked in `jobStore.ts`, keyed by a generated `jobId`. Stopping a job (`stopSimulation`) needs to reach into `engine.ts`'s `activeIntervals` map to actually `clearInterval` the right timer — jobs aren't "cancelled" by a flag being checked, the underlying `setInterval` is genuinely torn down. On both natural completion and manual stop, a `"job-status-changed"` event is emitted so the dashboard's job list reflects true state immediately rather than guessing from elapsed wall-clock time (an earlier version tried estimating "is this job done yet" client-side from `Date.now()`, which drifted and left stale "stop" buttons around — worth avoiding that pattern if this gets extended further).

## Socket events, all in one place

| Event | Emitted by | Frequency | Purpose |
|---|---|---|---|
| `metrics` | gateway | every 250ms | rolled-up rate-limiter/cache totals, ratios, deltas, avg latency, live algorithm state |
| `initial-config` | gateway | once, on new connection | current rate-limiter + cache config, so a newly-opened dashboard tab isn't blank until something changes |
| `request-event` | traffic-generator | per request | raw per-request outcome, feeds the live request table and client-computed instant rates |
| `job-status-changed` | traffic-generator | on job completion/stop | authoritative job status, so the dashboard never has to guess |

## Design decisions worth remembering

**Why totals *and* deltas in the metrics payload, not one or the other.** Early versions only emitted deltas (what changed since last tick) for a smooth "instant rate" feel, computed via snapshot subtraction. That required carrying mutable state (`lastRateSnapshot`) between ticks, which felt more complex than necessary for what it bought. A later version dropped the deltas entirely and only emitted running totals — simpler, but lost the ability to show "requests/sec right now" without the frontend reconstructing it from the raw event stream. The final version keeps both: totals for anything that wants "current overall state" (climbing line charts, instrument-panel numbers), deltas for anything that wants "what's happening this instant." The statefulness cost was worth paying once both were genuinely needed.

**Why config-change broadcasts (`rate-limiter-config-changed`, `cache-config-changed`) were considered and then *not* implemented.** These would only matter if multiple simultaneous dashboard viewers needed to see each other's config changes live. For a single-operator tool, the REST response from the config POST itself is already sufficient — the tab that made the change already has the new config in hand. Adding a broadcast here would be solving a staleness problem that doesn't currently exist. If this project ever needs multi-viewer support, this is the first place to revisit — but per-user config isolation (see the rate-limiter section above) would need solving first, since right now "broadcasting a config change" and "that change silently affecting every other user's traffic" are the same underlying fact.

**Why `/health` and `/` aren't behind the rate limiter.** An early version accidentally applied `rateLimiterMiddleware` with `app.use(rateLimiter)` — no path scope — which meant health checks were being throttled alongside real traffic, which makes no sense for infrastructure monitoring endpoints. Scoping it explicitly to `/resource` fixed this; worth remembering as a reminder to scope any *future* middleware additions the same way rather than applying globally by default.