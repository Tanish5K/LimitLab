import type { CacheConfig } from "./types";

let currentConfig: CacheConfig = {
  enabled: true,
  ttlSeconds: 30,
};

export function getCacheConfig(): CacheConfig {
  return currentConfig;
}

export function updateCacheConfig(patch: Partial<CacheConfig>) {
  currentConfig = { ...currentConfig, ...patch };
}