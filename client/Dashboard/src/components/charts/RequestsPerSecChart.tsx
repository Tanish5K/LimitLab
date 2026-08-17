import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SecondBucket } from "../../lib/bucketing";

function formatTime(second: number) { return new Date(second * 1000).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }); }
function Tip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: number }) { return active && payload?.length ? <div className="ll-chart-tooltip">{formatTime(Number(label))}<br /><strong>{payload[0].value ?? 0} req/s</strong></div> : null; }

export function RequestsPerSecChart({ data }: { data: SecondBucket[] }) {
  return <div id="requests-per-sec-chart"><div className="ll-chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}><CartesianGrid strokeDasharray="2 6" vertical={false} /><XAxis dataKey="second" tickFormatter={formatTime} minTickGap={30} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} /><Tooltip content={<Tip />} cursor={{ stroke: "#8a7cf3", strokeOpacity: .28 }} /><Line type="monotone" dataKey="total" name="requests" stroke="#8a7cf3" strokeWidth={2.2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div>;
}
