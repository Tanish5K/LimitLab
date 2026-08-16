import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { SecondBucket } from "../../lib/bucketing";

function formatTime(second: number) {
  return new Date(second * 1000).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });
}

export function RequestsPerSecChart({ data }: { data: SecondBucket[] }) {
  return (
    <div id="requests-per-sec-chart" className="chart-card">
      <h3 className="chart-title">Requests / sec</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="second" tickFormatter={formatTime} minTickGap={30} />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(v) => formatTime(Number(v))} />
          <Line type="monotone" dataKey="total" name="requests" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}