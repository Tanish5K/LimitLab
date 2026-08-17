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
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="second" tickFormatter={formatTime} minTickGap={30} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <Tooltip labelFormatter={(v) => formatTime(Number(v))} cursor={{ stroke: "#3ee6b0", strokeOpacity: 0.25 }} />
          <Line
            type="monotone"
            dataKey="total"
            name="requests"
            stroke="#3ee6b0"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
