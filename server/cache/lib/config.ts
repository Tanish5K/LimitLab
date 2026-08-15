import type { CacheConfig } from "./types";

let currentConfig: CacheConfig = {
  enabled: false,
  ttlSeconds: 30,
};

export function getCacheConfig(): CacheConfig {
  return currentConfig;
}

export function updateCacheConfig(patch: Partial<CacheConfig>) {
  currentConfig = { ...currentConfig, ...patch };
}