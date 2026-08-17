import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SecondBucket } from "../../lib/bucketing";

function formatTime(second: number) { return new Date(second * 1000).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }); }
function Tip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: number }) { return active && payload?.length ? <div className="ll-chart-tooltip">{formatTime(Number(label))}{payload.map((item) => <div key={item.name} style={{ color: item.color }}>{item.name}: {item.value ?? 0}</div>)}</div> : null; }

export function AllowedRejectedChart({ data }: { data: SecondBucket[] }) {
  return <div id="allowed-rejected-chart"><div className="ll-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}><CartesianGrid strokeDasharray="2 6" vertical={false} /><XAxis dataKey="second" tickFormatter={formatTime} minTickGap={30} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} /><Tooltip content={<Tip />} cursor={{ fill: "rgba(138,124,243,.06)" }} /><Legend iconType="plainline" wrapperStyle={{ color: "#a5a2bb", fontSize: "10px" }} /><Bar dataKey="allowed" stackId="a" name="allowed" fill="#63d58a" maxBarSize={14} isAnimationActive={false} /><Bar dataKey="rejected" stackId="a" name="rejected" fill="#ed777d" maxBarSize={14} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></div>;
}
