import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SecondBucket } from "../../lib/bucketing";

function formatTime(second: number) { return new Date(second * 1000).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }); }
function Tip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: number }) { return active && payload?.length ? <div className="ll-chart-tooltip">{formatTime(Number(label))}<br /><strong>{payload[0].value ?? 0}ms</strong></div> : null; }

export function LatencyChart({ data }: { data: SecondBucket[] }) {
  return <div id="latency-chart"><div className="ll-chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}><CartesianGrid strokeDasharray="2 6" vertical={false} /><XAxis dataKey="second" tickFormatter={formatTime} minTickGap={30} tickLine={false} axisLine={false} /><YAxis unit="ms" tickLine={false} axisLine={false} width={48} /><Tooltip content={<Tip />} cursor={{ stroke: "#eac457", strokeOpacity: .28 }} /><Line type="monotone" dataKey="avgLatencyMs" name="avg latency" stroke="#eac457" strokeWidth={2.2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div>;
}
