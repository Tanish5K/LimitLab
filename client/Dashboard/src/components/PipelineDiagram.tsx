const STAGES = [
  { id: "gen", label: "Traffic Gen", sub: "emit", x: 90 },
  { id: "gateway", label: "Gateway", sub: "ingress", x: 300 },
  { id: "limiter", label: "Rate Limiter", sub: "allow / reject", x: 510 },
  { id: "cache", label: "Cache", sub: "lookup", x: 720 },
  { id: "backend", label: "Backend", sub: "origin", x: 930 },
] as const;
const MID_Y = 58;
const SEGMENTS = STAGES.slice(0, -1).map((stage, index) => ({ id: `${stage.id}-${STAGES[index + 1].id}`, from: stage.x, to: STAGES[index + 1].x }));

export function PipelineDiagram({ className = "" }: { className?: string }) {
  return (
    <section className={`ll-panel ll-pipeline ${className}`} id="request-flow-panel">
      <div className="ll-panel-header"><div><div className="ll-kicker">Request flow</div><h2 className="ll-panel-title">Pipeline</h2></div><span className="ll-panel-meta">live</span></div>
      <svg viewBox="0 0 1020 112" role="img" aria-label="Request signal flow from Traffic Generator to Gateway to Rate Limiter to Cache to Backend">
        <defs>
          <linearGradient id="ll-wire" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#312e4c" /><stop offset="50%" stopColor="#7166cf" /><stop offset="100%" stopColor="#312e4c" /></linearGradient>
        </defs>
        {SEGMENTS.map((segment) => <g key={segment.id}>
          <line x1={segment.from} y1={MID_Y} x2={segment.to} y2={MID_Y} stroke="url(#ll-wire)" strokeWidth="2" />
          <line x1={segment.from} y1={MID_Y} x2={segment.to} y2={MID_Y} stroke="#8a7cf3" strokeOpacity=".28" strokeDasharray="2 12" strokeWidth="1" style={{ animation: "ll-dash 13s linear infinite" }} />
          {[0, 1, 2].map((index) => <circle key={`${segment.id}-dot-${index}`} className="ll-flow-dot" r="3" cx="0" cy="0" style={{ offsetPath: `path('M ${segment.from} ${MID_Y} L ${segment.to} ${MID_Y}')`, animation: `ll-flow 2.6s linear infinite`, animationDelay: `${index * 0.85}s` }} />)}
        </g>)}
        <path d={`M ${STAGES[2].x} ${MID_Y} q 20 23 46 39`} fill="none" stroke="#ed777d" strokeOpacity=".35" strokeDasharray="3 6" />
        <circle className="ll-flow-dot ll-flow-dot--reject" r="2.5" cx="0" cy="0" style={{ offsetPath: `path('M ${STAGES[2].x} ${MID_Y} q 20 23 46 39')`, animation: "ll-flow 2.8s ease-in infinite", animationDelay: ".8s" }} />
        {STAGES.map((stage, index) => <g key={stage.id}>
          <circle className="ll-node-ring" cx={stage.x} cy={MID_Y} r="11" fill="none" stroke="#8a7cf3" strokeWidth="1.5" style={{ animationDelay: `${index * .45}s` }} />
          <circle cx={stage.x} cy={MID_Y} r="8" fill="#10101a" stroke="#8a7cf3" strokeWidth="1.5" />
          <circle cx={stage.x} cy={MID_Y} r="3" fill="#8a7cf3" />
          <text x={stage.x} y={MID_Y + 28} textAnchor="middle" className="ll-pipeline__stage-label">{stage.label}</text>
          <text x={stage.x} y={MID_Y + 42} textAnchor="middle" className="ll-pipeline__stage-sub">{stage.sub}</text>
        </g>)}
      </svg>
    </section>
  );
}
