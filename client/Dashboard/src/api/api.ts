const GATEWAY_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
const TRAFFIC_GEN_URL = import.meta.env.VITE_TRAFFIC_GEN_URL || "http://localhost:5000";

export async function updateRateLimiterConfig(config: object) {
  const res = await fetch(`${GATEWAY_URL}/api/rate-limiter/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function updateCacheConfig(config: object) {
  const res = await fetch(`${GATEWAY_URL}/api/cache/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function startSimulation(config: object) {
  const res = await fetch(`${TRAFFIC_GEN_URL}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function stopSimulation(jobId: string) {
  const res = await fetch(`${TRAFFIC_GEN_URL}/simulate/${jobId}/stop`, { method: "POST" });
  return res.json();
}

export async function resetMetrics() {
  await fetch(`${GATEWAY_URL}/api/rate-limiter/metrics/reset`, { method: "POST" });
  await fetch(`${GATEWAY_URL}/api/cache/metrics/reset`, { method: "POST" });
}