import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { SecondBucket } from "../../lib/bucketing";

function formatTime(second: number) {
  return new Date(second * 1000).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });
}

export function AllowedRejectedChart({ data }: { data: SecondBucket[] }) {
  return (
    <div id="allowed-rejected-chart" className="chart-card">
      <h3 className="chart-title">Allowed vs Rejected</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="second" tickFormatter={formatTime} minTickGap={30} />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(v) => formatTime(Number(v))} />
          <Legend />
          <Bar dataKey="allowed" stackId="a" name="allowed" fill="#22c55e" isAnimationActive={false} />
          <Bar dataKey="rejected" stackId="a" name="rejected" fill="#ef4444" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}