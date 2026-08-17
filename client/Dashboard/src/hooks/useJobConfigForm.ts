import { useState, type SubmitEvent } from "react";
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

interface UseJobConfigFormArgs {
  onJobStarted: (data: {
    jobId: string;
    trafficConfig: TrafficConfig;
    rateLimiterConfig: RateLimiterConfig;
    cacheConfig: CacheConfig;
  }) => void;
}

export function useJobConfigForm({ onJobStarted }: UseJobConfigFormArgs) {
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

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
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

  return {
    pattern, setPattern,
    rps, setRps,
    durationSeconds, setDurationSeconds,
    clients, setClients,
    resourceMode, setResourceMode,
    spikeAt, setSpikeAt,
    spikeMultiplier, setSpikeMultiplier,
    algorithm, setAlgorithm,
    tokenCapacity, setTokenCapacity,
    tokenRefillRate, setTokenRefillRate,
    leakyCapacity, setLeakyCapacity,
    leakyDrainRate, setLeakyDrainRate,
    windowMax, setWindowMax,
    windowMs, setWindowMs,
    windowMode, setWindowMode,
    cacheEnabled, setCacheEnabled,
    ttlSeconds, setTtlSeconds,
    submitting,
    handleSubmit,
  };
}