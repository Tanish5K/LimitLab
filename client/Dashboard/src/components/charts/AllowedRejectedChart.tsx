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
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="second" tickFormatter={formatTime} minTickGap={30} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <Tooltip labelFormatter={(v) => formatTime(Number(v))} cursor={{ fill: "rgba(62,230,176,0.06)" }} />
          <Legend iconType="plainline" />
          <Bar dataKey="allowed" stackId="a" name="allowed" fill="#3ee6b0" maxBarSize={14} isAnimationActive={false} />
          <Bar dataKey="rejected" stackId="a" name="rejected" fill="#ff5468" maxBarSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
