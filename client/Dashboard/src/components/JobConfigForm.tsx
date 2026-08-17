import { useJobConfigForm } from "../hooks/useJobConfigForm";
import type { TrafficConfig, RateLimiterConfig, CacheConfig, TrafficPattern, ResourceMode, Algorithm, SlidingWindowMode } from "../lib/types";

interface JobConfigFormProps {
  onJobStarted: (data: { jobId: string; trafficConfig: TrafficConfig; rateLimiterConfig: RateLimiterConfig; cacheConfig: CacheConfig }) => void;
}

export function JobConfigForm({ onJobStarted }: JobConfigFormProps) {
  const f = useJobConfigForm({ onJobStarted });

  return (
    <form id="job-config-form" onSubmit={f.handleSubmit} className="chart-card flex flex-col gap-4">
      <h2 className="chart-title">New Job</h2>

      <fieldset id="traffic-config-fields" className="flex flex-wrap gap-4">
        <label className="flex flex-col">
          pattern
          <select value={f.pattern} onChange={(e) => f.setPattern(e.target.value as TrafficPattern)}>
            <option value="constant">constant</option>
            <option value="spike">spike</option>
            <option value="ramp-up">ramp-up</option>
          </select>
        </label>
        <label className="flex flex-col">
          RPS
          <input type="number" min={1} value={f.rps} onChange={(e) => f.setRps(Number(e.target.value))} />
        </label>
        <label className="flex flex-col">
          duration (s)
          <input type="number" min={1} value={f.durationSeconds} onChange={(e) => f.setDurationSeconds(Number(e.target.value))} />
        </label>
        <label className="flex flex-col">
          clients
          <input type="number" min={1} value={f.clients} onChange={(e) => f.setClients(Number(e.target.value))} />
        </label>
        <label className="flex flex-col">
          resource mode
          <select value={f.resourceMode} onChange={(e) => f.setResourceMode(e.target.value as ResourceMode)}>
            <option value="identical">identical</option>
            <option value="unique">unique</option>
          </select>
        </label>
        {f.pattern === "spike" && (
          <>
            <label className="flex flex-col">
              spike at (s)
              <input type="number" min={0} value={f.spikeAt} onChange={(e) => f.setSpikeAt(Number(e.target.value))} />
            </label>
            <label className="flex flex-col">
              spike multiplier
              <input type="number" min={1} value={f.spikeMultiplier} onChange={(e) => f.setSpikeMultiplier(Number(e.target.value))} />
            </label>
          </>
        )}
      </fieldset>

      <fieldset id="rate-limiter-config-fields" className="flex flex-wrap gap-4">
        <label className="flex flex-col">
          algorithm
          <select value={f.algorithm} onChange={(e) => f.setAlgorithm(e.target.value as Algorithm)}>
            <option value="token-bucket">token bucket</option>
            <option value="leaky-bucket">leaky bucket</option>
            <option value="sliding-window">sliding window</option>
          </select>
        </label>

        {f.algorithm === "token-bucket" && (
          <>
            <label className="flex flex-col">
              capacity
              <input type="number" min={1} value={f.tokenCapacity} onChange={(e) => f.setTokenCapacity(Number(e.target.value))} />
            </label>
            <label className="flex flex-col">
              refill/sec
              <input type="number" min={0.1} step={0.1} value={f.tokenRefillRate} onChange={(e) => f.setTokenRefillRate(Number(e.target.value))} />
            </label>
          </>
        )}

        {f.algorithm === "leaky-bucket" && (
          <>
            <label className="flex flex-col">
              queue capacity
              <input type="number" min={1} value={f.leakyCapacity} onChange={(e) => f.setLeakyCapacity(Number(e.target.value))} />
            </label>
            <label className="flex flex-col">
              drain/sec
              <input type="number" min={0.1} step={0.1} value={f.leakyDrainRate} onChange={(e) => f.setLeakyDrainRate(Number(e.target.value))} />
            </label>
          </>
        )}

        {f.algorithm === "sliding-window" && (
          <>
            <label className="flex flex-col">
              max requests
              <input type="number" min={1} value={f.windowMax} onChange={(e) => f.setWindowMax(Number(e.target.value))} />
            </label>
            <label className="flex flex-col">
              window (ms)
              <input type="number" min={100} step={100} value={f.windowMs} onChange={(e) => f.setWindowMs(Number(e.target.value))} />
            </label>
            <label className="flex flex-col">
              mode
              <select value={f.windowMode} onChange={(e) => f.setWindowMode(e.target.value as SlidingWindowMode)}>
                <option value="log">log (exact)</option>
                <option value="counter">counter (approx)</option>
              </select>
            </label>
          </>
        )}
      </fieldset>

      <fieldset id="cache-config-fields" className="flex flex-wrap gap-4 items-end">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.cacheEnabled} onChange={(e) => f.setCacheEnabled(e.target.checked)} />
          redis cache enabled
        </label>
        <label className="flex flex-col">
          TTL (s)
          <input type="number" min={1} value={f.ttlSeconds} disabled={!f.cacheEnabled} onChange={(e) => f.setTtlSeconds(Number(e.target.value))} />
        </label>
      </fieldset>

      <button id="start-job-btn" type="submit" disabled={f.submitting}>
        {f.submitting ? "starting..." : "start job"}
      </button>
    </form>
  );
}