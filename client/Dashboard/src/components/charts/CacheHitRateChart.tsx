import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { SecondBucket } from "../../lib/bucketing";

function formatTime(second: number) {
  return new Date(second * 1000).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });
}

export function CacheHitRateChart({ data }: { data: SecondBucket[] }) {
  const withRate = data.map((b) => ({
    ...b,
    hitRatePercent:
      b.cacheHits + b.cacheMisses > 0 ? Math.round((b.cacheHits / (b.cacheHits + b.cacheMisses)) * 100) : null,
  }));

  return (
    <div id="cache-hit-rate-chart" className="chart-card">
      <h3 className="chart-title">Cache Hit Rate</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={withRate}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="second" tickFormatter={formatTime} minTickGap={30} />
          <YAxis domain={[0, 100]} unit="%" />
          <Tooltip labelFormatter={(v) => formatTime(Number(v))} />
          <Line type="monotone" dataKey="hitRatePercent" name="hit rate %" dot={false} isAnimationActive={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}