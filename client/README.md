# Limit Lab — `client/Dashboard/`

This explains how the dashboard frontend is organized and why — written for me, so that six months from now I can open this folder and immediately remember the reasoning instead of re-deriving it. Installation lives in the root README.

## The core architectural rule: logic and presentation are separate files

Every component in `components/` is intentionally "dumb" — it receives data and callbacks as props and renders JSX, full stop. No `useState`, no `fetch`, no socket handling, no business logic lives in a component file. All of that lives in `hooks/`. This wasn't the original structure — it's something I refactored into partway through, specifically so I could hand UI-only files to an AI tool (or anyone else) for restyling without any risk of them touching how the app actually works. If a file is in `components/` or is `App.tsx`, it's safe to restyle freely. If it's in `hooks/`, `lib/`, or is `api.ts`/`types.ts`, it's logic and shouldn't be touched by a pure styling pass.

```
src/
  App.tsx              -- pure layout, zero logic, reads everything from useDashboard()
  index.css
  api.ts                -- every REST call, in one place
  types.ts               -- shared TypeScript interfaces
  lib/
    metricSocket.ts       -- socket.io-client connection to the gateway
    trafficGenSocket.ts   -- socket.io-client connection to traffic-generator
    bucketing.ts           -- turns raw request events into per-second chart data
  hooks/
    useMetricSocket.ts     -- gateway's live "metrics" feed
    useTrafficSocket.ts    -- traffic-gen's live per-request feed + job status events
    useJobConfigForm.ts    -- all New Job form state + submit logic
    useDashboard.ts         -- orchestrates everything App.tsx needs
  components/
    JobConfigForm.tsx
    JobsList.tsx
    RequestEventsTable.tsx
    AlgorithmStateView.tsx
    charts/
      RequestsPerSecChart.tsx
      AllowedRejectedChart.tsx
      CacheHitRateChart.tsx
      LatencyChart.tsx
```

## Two sockets, not one, and why

The dashboard maintains two independent Socket.io connections — one to the gateway (port 3000), one to the traffic-generator (port 5000) — because they're genuinely different services emitting genuinely different kinds of data:

- **`metricSocket`** connects to the gateway and receives the `"metrics"` event — a rolled-up snapshot every 250ms (totals, ratios, deltas, live algorithm state). This is the *aggregate* view: "how is the system doing overall."
- **`trafficGenSocket`** connects to traffic-generator and receives `"request-event"` (one per real request fired) and `"job-status-changed"`. This is the *granular* view: "what happened to this specific request."

Having both, rather than picking one, is what lets the dashboard do two different jobs well: the metrics socket drives the big-picture charts and instrument-panel numbers efficiently (only 4 updates/sec regardless of actual traffic volume), while the traffic-gen socket's raw stream is what powers the live request table and lets the frontend derive its own per-job stats (see `useDashboard.ts` below) without needing the backend to pre-compute everything per-job.

## The buffer-and-flush pattern in `useTrafficSocket`

At low request rates, calling `setState` directly inside a socket event handler is fine. It stopped being fine once I tested at ~100 RPS — that's up to 100 React re-renders per second, each one re-running downstream chart calculations, which visibly lagged the UI and made the live-request chart appear to "delete itself" as a small fixed-size event buffer got overwhelmed.

The fix, and the pattern worth remembering for any future high-frequency socket feed in this app: **buffer incoming events in a `ref` (which doesn't trigger re-renders), and flush that buffer into real React state on a fixed timer instead.**
```ts
function handleEvent(event: RequestEvent) {
  bufferRef.current.push(event); // no re-render here
}

const flushInterval = setInterval(() => {
  if (bufferRef.current.length === 0) return;
  const toFlush = bufferRef.current;
  bufferRef.current = []; // cleared BEFORE setEvents, not inside its updater
  setEvents((prev) => [...prev, ...toFlush].filter((e) => e.timestamp >= cutoff));
}, FLUSH_INTERVAL_MS);
```
One real bug worth documenting here: an earlier version cleared `bufferRef.current = []` *inside* the `setEvents` updater function. In React (especially Strict Mode, which can invoke updater functions more than once to catch impure behavior), mutating something outside the updater from *inside* the updater is exactly the kind of side effect that can silently drop data — events were disappearing even though traffic-generator's own logs proved they were being sent correctly. The fix was moving the buffer-clearing to happen as its own statement, before `setEvents` is ever called, so the updater itself stays pure (only reads `prev` and the already-captured `toFlush`).

Retention is time-based (`RETENTION_MS`, currently 60 seconds), not count-based. An earlier version capped the array at a fixed number of events (`MAX_EVENTS = 200`), which worked fine at low RPS but meant the chart's rolling time window was mostly empty at high RPS, since 200 events might represent only 2 seconds of real history. Switching to "keep everything newer than N milliseconds" means the amount of visible history stays consistent regardless of traffic volume.

## `lib/bucketing.ts`

Every chart needs the same underlying transformation: take the raw `RequestEvent[]` stream for whichever job is selected, and turn it into fixed one-second buckets with `allowed`/`rejected`/`cacheHits`/`cacheMisses`/`avgLatencyMs` per second — so this logic lives in exactly one place rather than being duplicated across four chart components.

The one detail that actually matters here: it explicitly loops across *every second* in the window, including ones with zero events, rather than only producing buckets for seconds that had activity:
```ts
for (let sec = startSecond; sec <= nowSecond; sec++) {
  const bucketEvents = buckets.get(sec) ?? [];
  // ...push a bucket even if bucketEvents is empty
}
```
Skipping this and only mapping over events-that-exist would make genuinely continuous, steady traffic *look* bursty on the chart — gaps where there was no activity would just be absent instead of rendering as a flat zero. This was actually the root cause of a real bug I chased for a while (a "constant" traffic pattern visually looked like discrete bursts) before realizing the traffic itself was fine and the charting math was the problem.

## Connection status: initialize from `.connected`, not `false`

Both socket hooks track a `connected` boolean. The naive version:
```ts
const [connected, setConnected] = useState(false); // wrong
```
This has a real race condition: the underlying socket connection begins the moment the socket module is imported, which can happen *before* the component finishes mounting and attaches its `"connect"` listener. If the connection succeeds in that gap, the `"connect"` event fires and is missed — the UI shows "disconnected" forever even though data is visibly flowing. Fixed by reading the socket's own already-tracked state at initialization:
```ts
const [connected, setConnected] = useState(metricSocket.connected); // correct
```

## `hooks/useDashboard.ts` — deriving state instead of duplicating it

This hook backs `App.tsx` and owns: the list of jobs started this session, which job is currently selected, and the derived stats shown per job.

An earlier version tracked each job's `requestsSent`/`requestsAllowed`/`requestsRejected` by polling `GET /simulate/:jobId` on a 1-second interval for any job still "running." I removed this entirely — every one of those numbers is already fully derivable from the `request-event` stream the app already has in memory, since each event carries `jobId` and `status`:
```ts
function getJobStats(job: JobRecord, events: RequestEvent[]) {
  const jobEvents = events.filter((e) => e.jobId === job.jobId);
  return {
    requestsSent: jobEvents.length,
    requestsAllowed: jobEvents.filter((e) => e.status !== null && e.status < 400).length,
    requestsRejected: jobEvents.filter((e) => e.status === 429).length,
    status: job.status,
  };
}
```
No REST round-trip, no polling interval to manage, no risk of the poll and the socket feed disagreeing with each other. `useMemo` keeps this from recomputing on every unrelated render.

**Job status specifically is *not* derived this way** — it comes from the authoritative `"job-status-changed"` socket event (see server README) rather than being estimated. An early version guessed "is this job done" by comparing `Date.now()` against `createdAt + durationSeconds`, inside the same memo used for the stats above. The problem: that memo only recomputes when its dependencies (`jobs`, `events`) change — once a finished job stops producing new events, nothing ever re-triggers the memo again, so the estimated status froze at whatever it last happened to be and the "stop" button stayed visible on already-finished jobs indefinitely. Listening for the real server-emitted event instead of estimating from wall-clock time fixed it permanently — worth remembering as a general rule: anything with an authoritative source of truth on the server shouldn't be reconstructed client-side from timing assumptions.

## `hooks/useJobConfigForm.ts`

Owns every field in the "New Job" form — traffic pattern/RPS/duration/clients/resource-mode, all three algorithms' parameters (only the active one's fields are ever shown, via the algorithm dropdown), and the cache toggle/TTL. On submit, it does three sequential things: pushes the rate-limiter config, pushes the cache config, then starts the simulation — in that order, so the traffic that's about to be generated always runs against the config that was just set, not a stale one from a previous run.

## `api.ts`

Every REST call the frontend makes lives here, nowhere else — components and hooks call these functions, they never call `fetch` directly. This made it trivial to give an AI restyling tool a clean logic/presentation split (see top of this doc), and it means there's exactly one place to look if a request URL or payload shape ever needs to change.

## Why chart components take pre-bucketed data as props, not raw events

Each chart in `components/charts/` receives a `SecondBucket[]` (from `bucketEventsBySecond`), not the raw event stream. This keeps the chart components genuinely presentational — they don't know or care where the data came from, they just render whatever array of `{ second, total, allowed, rejected, ... }` objects they're handed. It also means the (more complex) bucketing logic only needs testing/debugging in one place instead of being re-implemented slightly differently in four chart files.

## Global metrics vs. per-job charts — a real distinction, not an inconsistency

The dashboard shows two categories of numbers that are easy to conflate but genuinely mean different things:

- **Global metrics panel** (`d.latestTick?.rate...`, `d.latestTick?.cache...`) — reflects the gateway's shared rate limiter and cache, which are process-wide, not scoped to any one job. If two jobs run back to back without a metrics reset in between, this panel reflects *both* combined.
- **Per-job charts** — built by filtering the raw `request-event` stream down to `e.jobId === selectedJobId` before bucketing. These only ever reflect the currently-selected job.

This isn't a design inconsistency — it's honest about the fact that there's only one shared rate limiter and one shared cache in this architecture (see server README's config section), so pretending metrics are cleanly per-job would misrepresent how the system actually works.

## Styling approach

Base styling was scaffolded with Tailwind utility classes directly in JSX, with `index.css` reserved for things Tailwind doesn't cleanly cover (custom keyframe animations, background textures, font-face declarations). The visual design was later generated with Vercel v0, using the logic/presentation file split above to constrain it strictly to `App.tsx`, `index.css`, and the `components/` files — every file under `hooks/`, `lib/`, `api.ts`, and `types.ts` was explicitly marked read-only in the generation prompt, specifically so a restyling pass could never accidentally alter how data is fetched, computed, or handled.

## Known limitations, worth remembering

- No routing — this is intentionally a single-page app. Any sidebar/nav-looking UI is in-page anchor scrolling, not actual navigation, because there's nowhere else to navigate to.
- No persistence — jobs, selected job, and all event history live in React state and reset on page reload. There's no backend job history endpoint being read from; everything shown is reconstructed from live socket data since the tab connected.
- Config changes are global and immediate (see server README) — there's currently no confirmation step or "are you sure" before a running job's traffic starts being evaluated against newly changed rate-limiter/cache settings.