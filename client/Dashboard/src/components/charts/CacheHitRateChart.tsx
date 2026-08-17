import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SecondBucket } from "../../lib/bucketing";

function formatTime(second: number) { return new Date(second * 1000).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }); }
function Tip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: number }) { return active && payload?.length ? <div className="ll-chart-tooltip">{formatTime(Number(label))}<br /><strong>{payload[0].value ?? 0}% hit rate</strong></div> : null; }

export function CacheHitRateChart({ data }: { data: SecondBucket[] }) {
  const withRate = data.map((bucket) => ({ ...bucket, hitRatePercent: bucket.cacheHits + bucket.cacheMisses > 0 ? Math.round(bucket.cacheHits / (bucket.cacheHits + bucket.cacheMisses) * 100) : null }));
  return <div id="cache-hit-rate-chart"><div className="ll-chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={withRate} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}><CartesianGrid strokeDasharray="2 6" vertical={false} /><XAxis dataKey="second" tickFormatter={formatTime} minTickGap={30} tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} width={44} /><Tooltip content={<Tip />} cursor={{ stroke: "#8a7cf3", strokeOpacity: .28 }} /><Line type="monotone" dataKey="hitRatePercent" name="hit rate %" stroke="#8a7cf3" strokeWidth={2.2} dot={false} isAnimationActive={false} connectNulls /></LineChart></ResponsiveContainer></div></div>;
}
