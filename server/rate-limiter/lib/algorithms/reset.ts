import { resetTokenBuckets } from "./tokenBucket";
import { resetSlidingWindowLog } from "./slidingWindowLog";
import { resetSlidingWindowCounter } from "./slidingWindowCounter";

export function resetAlgorithmState() {
  resetTokenBuckets();
  resetSlidingWindowLog();
  resetSlidingWindowCounter();
}