import { useJobConfigForm } from "../hooks/useJobConfigForm";
import type { TrafficConfig, RateLimiterConfig, CacheConfig, TrafficPattern, ResourceMode, Algorithm, SlidingWindowMode } from "../lib/types";

interface JobConfigFormProps {
  onJobStarted: (data: { jobId: string; trafficConfig: TrafficConfig; rateLimiterConfig: RateLimiterConfig; cacheConfig: CacheConfig }) => void;
}

export function JobConfigForm({ onJobStarted }: JobConfigFormProps) {
  const f = useJobConfigForm({ onJobStarted });

  return (
    <form id="job-config-form" onSubmit={f.handleSubmit} className="ll-form">
      <div className="ll-form-section-title">Traffic generator</div>
      <fieldset id="traffic-config-fields" className="ll-form-fieldset ll-form-fieldset--wide">
        <label className="ll-form-field">Pattern
          <select value={f.pattern} onChange={(e) => f.setPattern(e.target.value as TrafficPattern)}>
            <option value="constant">constant</option><option value="spike">spike</option><option value="ramp-up">ramp-up</option>
          </select>
        </label>
        <label className="ll-form-field">RPS
          <input type="number" min={1} value={f.rps} onChange={(e) => f.setRps(Number(e.target.value))} />
        </label>
        <label className="ll-form-field">Duration (s)
          <input type="number" min={1} value={f.durationSeconds} onChange={(e) => f.setDurationSeconds(Number(e.target.value))} />
        </label>
        <label className="ll-form-field">Clients
          <input type="number" min={1} value={f.clients} onChange={(e) => f.setClients(Number(e.target.value))} />
        </label>
        <label className="ll-form-field">Resource mode
          <select value={f.resourceMode} onChange={(e) => f.setResourceMode(e.target.value as ResourceMode)}>
            <option value="identical">identical</option><option value="unique">unique</option>
          </select>
        </label>
        {f.pattern === "spike" && <>
          <label className="ll-form-field">Spike at (s)
            <input type="number" min={0} value={f.spikeAt} onChange={(e) => f.setSpikeAt(Number(e.target.value))} />
          </label>
          <label className="ll-form-field">Spike multiplier
            <input type="number" min={1} value={f.spikeMultiplier} onChange={(e) => f.setSpikeMultiplier(Number(e.target.value))} />
          </label>
        </>}
      </fieldset>

      <div className="ll-form-section-title">Rate limiter</div>
      <fieldset id="rate-limiter-config-fields" className="ll-form-fieldset ll-form-fieldset--wide">
        <label className="ll-form-field">Algorithm
          <select value={f.algorithm} onChange={(e) => f.setAlgorithm(e.target.value as Algorithm)}>
            <option value="token-bucket">token bucket</option><option value="leaky-bucket">leaky bucket</option><option value="sliding-window">sliding window</option>
          </select>
        </label>
        {f.algorithm === "token-bucket" && <>
          <label className="ll-form-field">Capacity
            <input type="number" min={1} value={f.tokenCapacity} onChange={(e) => f.setTokenCapacity(Number(e.target.value))} />
          </label>
          <label className="ll-form-field">Refill / sec
            <input type="number" min={0.1} step={0.1} value={f.tokenRefillRate} onChange={(e) => f.setTokenRefillRate(Number(e.target.value))} />
          </label>
        </>}
        {f.algorithm === "leaky-bucket" && <>
          <label className="ll-form-field">Queue capacity
            <input type="number" min={1} value={f.leakyCapacity} onChange={(e) => f.setLeakyCapacity(Number(e.target.value))} />
          </label>
          <label className="ll-form-field">Drain / sec
            <input type="number" min={0.1} step={0.1} value={f.leakyDrainRate} onChange={(e) => f.setLeakyDrainRate(Number(e.target.value))} />
          </label>
        </>}
        {f.algorithm === "sliding-window" && <>
          <label className="ll-form-field">Max requests
            <input type="number" min={1} value={f.windowMax} onChange={(e) => f.setWindowMax(Number(e.target.value))} />
          </label>
          <label className="ll-form-field">Window (ms)
            <input type="number" min={100} step={100} value={f.windowMs} onChange={(e) => f.setWindowMs(Number(e.target.value))} />
          </label>
          <label className="ll-form-field">Mode
            <select value={f.windowMode} onChange={(e) => f.setWindowMode(e.target.value as SlidingWindowMode)}>
              <option value="log">log (exact)</option><option value="counter">counter (approx)</option>
            </select>
          </label>
        </>}
      </fieldset>

      <div className="ll-form-section-title">Cache</div>
      <fieldset id="cache-config-fields" className="ll-form-fieldset">
        <label className="ll-check-field"><input type="checkbox" checked={f.cacheEnabled} onChange={(e) => f.setCacheEnabled(e.target.checked)} /> Redis cache enabled</label>
        <label className="ll-form-field">TTL (s)
          <input type="number" min={1} value={f.ttlSeconds} disabled={!f.cacheEnabled} onChange={(e) => f.setTtlSeconds(Number(e.target.value))} />
        </label>
      </fieldset>

      <div className="ll-form-footer"><button id="start-job-btn" className="ll-btn-primary" type="submit" disabled={f.submitting}>{f.submitting ? "Starting…" : "Start job"}</button></div>
    </form>
  );
}
