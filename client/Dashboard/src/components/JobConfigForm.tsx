import { useState, FormEvent } from "react";
import type {
  TrafficConfig,
  RateLimiterConfig,
  CacheConfig,
  Algorithm,
  TrafficPattern,
  ResourceMode,
  SlidingWindowMode,
} from "../lib/types";
import { updateRateLimiterConfig, updateCacheConfig, startSimulation } from "../api/api";

interface JobConfigFormProps {
  onJobStarted: (data: {
    jobId: string;
    trafficConfig: TrafficConfig;
    rateLimiterConfig: RateLimiterConfig;
    cacheConfig: CacheConfig;
  }) => void;
}

export function JobConfigForm({ onJobStarted }: JobConfigFormProps) {
  const [pattern, setPattern] = useState<TrafficPattern>("constant");
  const [rps, setRps] = useState(10);
  const [durationSeconds, setDurationSeconds] = useState(15);
  const [clients, setClients] = useState(3);
  const [resourceMode, setResourceMode] = useState<ResourceMode>("identical");
  const [spikeAt, setSpikeAt] = useState(7);
  const [spikeMultiplier, setSpikeMultiplier] = useState(5);

  const [algorithm, setAlgorithm] = useState<Algorithm>("token-bucket");
  const [tokenCapacity, setTokenCapacity] = useState(20);
  const [tokenRefillRate, setTokenRefillRate] = useState(5);
  const [leakyCapacity, setLeakyCapacity] = useState(20);
  const [leakyDrainRate, setLeakyDrainRate] = useState(5);
  const [windowMax, setWindowMax] = useState(20);
  const [windowMs, setWindowMs] = useState(1000);
  const [windowMode, setWindowMode] = useState<SlidingWindowMode>("counter");

  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [ttlSeconds, setTtlSeconds] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const trafficConfig: TrafficConfig = {
      pattern,
      rps,
      durationSeconds,
      clients,
      resourceMode,
      ...(pattern === "spike" ? { spikeAt, spikeMultiplier } : {}),
    };

    const rateLimiterConfig: RateLimiterConfig = {
      algorithm,
      tokenBucket: { capacity: tokenCapacity, refillRatePerSec: tokenRefillRate },
      leakyBucket: { capacity: leakyCapacity, drainRatePerSec: leakyDrainRate },
      slidingWindow: { maxRequests: windowMax, windowMs, mode: windowMode },
    };

    const cacheConfig: CacheConfig = { enabled: cacheEnabled, ttlSeconds };

    try {
      await updateRateLimiterConfig(rateLimiterConfig);
      await updateCacheConfig(cacheConfig);
      const { jobId } = await startSimulation(trafficConfig);
      onJobStarted({ jobId, trafficConfig, rateLimiterConfig, cacheConfig });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id="job-config-form" onSubmit={handleSubmit} className="chart-card flex flex-col gap-4">
      <h2 className="chart-title">New Job</h2>

      <fieldset id="traffic-config-fields" className="flex flex-wrap gap-4">
        <label className="flex flex-col">
          pattern
          <select value={pattern} onChange={(e) => setPattern(e.target.value as TrafficPattern)}>
            <option value="constant">constant</option>
            <option value="spike">spike</option>
            <option value="ramp-up">ramp-up</option>
          </select>
        </label>
        <label className="flex flex-col">
          RPS
          <input type="number" min={1} value={rps} onChange={(e) => setRps(Number(e.target.value))} />
        </label>
        <label className="flex flex-col">
          duration (s)
          <input type="number" min={1} value={durationSeconds} onChange={(e) => setDurationSeconds(Number(e.target.value))} />
        </label>
        <label className="flex flex-col">
          clients
          <input type="number" min={1} value={clients} onChange={(e) => setClients(Number(e.target.value))} />
        </label>
        <label className="flex flex-col">
          resource mode
          <select value={resourceMode} onChange={(e) => setResourceMode(e.target.value as ResourceMode)}>
            <option value="identical">identical</option>
            <option value="unique">unique</option>
          </select>
        </label>
        {pattern === "spike" && (
          <>
            <label className="flex flex-col">
              spike at (s)
              <input type="number" min={0} value={spikeAt} onChange={(e) => setSpikeAt(Number(e.target.value))} />
            </label>
            <label className="flex flex-col">
              spike multiplier
              <input type="number" min={1} value={spikeMultiplier} onChange={(e) => setSpikeMultiplier(Number(e.target.value))} />
            </label>
          </>
        )}
      </fieldset>

      <fieldset id="rate-limiter-config-fields" className="flex flex-wrap gap-4">
        <label className="flex flex-col">
          algorithm
          <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as Algorithm)}>
            <option value="token-bucket">token bucket</option>
            <option value="leaky-bucket">leaky bucket</option>
            <option value="sliding-window">sliding window</option>
          </select>
        </label>

        {algorithm === "token-bucket" && (
          <>
            <label className="flex flex-col">
              capacity
              <input type="number" min={1} value={tokenCapacity} onChange={(e) => setTokenCapacity(Number(e.target.value))} />
            </label>
            <label className="flex flex-col">
              refill/sec
              <input type="number" min={0.1} step={0.1} value={tokenRefillRate} onChange={(e) => setTokenRefillRate(Number(e.target.value))} />
            </label>
          </>
        )}

        {algorithm === "leaky-bucket" && (
          <>
            <label className="flex flex-col">
              queue capacity
              <input type="number" min={1} value={leakyCapacity} onChange={(e) => setLeakyCapacity(Number(e.target.value))} />
            </label>
            <label className="flex flex-col">
              drain/sec
              <input type="number" min={0.1} step={0.1} value={leakyDrainRate} onChange={(e) => setLeakyDrainRate(Number(e.target.value))} />
            </label>
          </>
        )}

        {algorithm === "sliding-window" && (
          <>
            <label className="flex flex-col">
              max requests
              <input type="number" min={1} value={windowMax} onChange={(e) => setWindowMax(Number(e.target.value))} />
            </label>
            <label className="flex flex-col">
              window (ms)
              <input type="number" min={100} step={100} value={windowMs} onChange={(e) => setWindowMs(Number(e.target.value))} />
            </label>
            <label className="flex flex-col">
              mode
              <select value={windowMode} onChange={(e) => setWindowMode(e.target.value as SlidingWindowMode)}>
                <option value="log">log (exact)</option>
                <option value="counter">counter (approx)</option>
              </select>
            </label>
          </>
        )}
      </fieldset>

      <fieldset id="cache-config-fields" className="flex flex-wrap gap-4 items-end">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={cacheEnabled} onChange={(e) => setCacheEnabled(e.target.checked)} />
          redis cache enabled
        </label>
        <label className="flex flex-col">
          TTL (s)
          <input type="number" min={1} value={ttlSeconds} disabled={!cacheEnabled} onChange={(e) => setTtlSeconds(Number(e.target.value))} />
        </label>
      </fieldset>

      <button id="start-job-btn" type="submit" disabled={submitting}>
        {submitting ? "starting..." : "start job"}
      </button>
    </form>
  );
}