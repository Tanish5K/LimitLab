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
        <LineChart data={withRate} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="second" tickFormatter={formatTime} minTickGap={30} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} width={44} />
          <Tooltip labelFormatter={(v) => formatTime(Number(v))} cursor={{ stroke: "#f4c04d", strokeOpacity: 0.25 }} />
          <Line
            type="monotone"
            dataKey="hitRatePercent"
            name="hit rate %"
            stroke="#f4c04d"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
