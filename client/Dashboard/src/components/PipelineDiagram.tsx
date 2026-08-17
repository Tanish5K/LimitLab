const STAGES = [
  { id: "gen", label: "Traffic Gen", sub: "emit", x: 90 },
  { id: "gateway", label: "Gateway", sub: "ingress", x: 300 },
  { id: "limiter", label: "Rate Limiter", sub: "allow / reject", x: 510 },
  { id: "cache", label: "Cache", sub: "redis", x: 720 },
  { id: "backend", label: "Backend", sub: "origin", x: 930 },
] as const;

const MID_Y = 96;

// wire segments between consecutive stages (used as motion paths for dots)
const SEGMENTS = STAGES.slice(0, -1).map((stage, i) => ({
  id: `${stage.id}-${STAGES[i + 1].id}`,
  from: stage.x,
  to: STAGES[i + 1].x,
}));

// a handful of dots per segment, staggered, to read as a continuous stream
const DOTS_PER_SEGMENT = 3;
const SEGMENT_DURATION = 2.2;

export function PipelineDiagram({ className = "" }: { className?: string }) {
  return (
    <div id="pipeline-diagram" className={`ll-pipeline ${className}`}>
      <span className="ll-pipeline__label">signal flow // live</span>

      <svg
        viewBox="0 0 1020 150"
        width="100%"
        role="img"
        aria-label="Request signal flow: Traffic Generator to Gateway to Rate Limiter to Cache to Backend"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="ll-wire" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1b2731" />
            <stop offset="50%" stopColor="#274552" />
            <stop offset="100%" stopColor="#1b2731" />
          </linearGradient>
        </defs>

        {/* base wires */}
        {SEGMENTS.map((seg) => (
          <line
            key={`wire-${seg.id}`}
            x1={seg.from}
            y1={MID_Y}
            x2={seg.to}
            y2={MID_Y}
            stroke="url(#ll-wire)"
            strokeWidth={2}
          />
        ))}

        {/* animated dashed energy along the wires */}
        {SEGMENTS.map((seg) => (
          <line
            key={`dash-${seg.id}`}
            x1={seg.from}
            y1={MID_Y}
            x2={seg.to}
            y2={MID_Y}
            stroke="#3ee6b0"
            strokeWidth={1}
            strokeOpacity={0.25}
            strokeDasharray="2 12"
            style={{ animation: "ll-dash 18s linear infinite" }}
          />
        ))}

        {/* rejected branch: signals falling away from the rate limiter */}
        <path
          d={`M ${STAGES[2].x} ${MID_Y} q 20 34 46 52`}
          fill="none"
          stroke="#ff5468"
          strokeWidth={1.5}
          strokeOpacity={0.3}
          strokeDasharray="3 6"
        />

        {/* traveling signal dots per segment */}
        {SEGMENTS.map((seg) =>
          Array.from({ length: DOTS_PER_SEGMENT }).map((_, i) => (
            <circle
              key={`dot-${seg.id}-${i}`}
              className="ll-flow-dot"
              r={3}
              cx={0}
              cy={0}
              style={{
                offsetPath: `path('M ${seg.from} ${MID_Y} L ${seg.to} ${MID_Y}')`,
                animation: `ll-flow ${SEGMENT_DURATION}s linear infinite`,
                animationDelay: `${(SEGMENT_DURATION / DOTS_PER_SEGMENT) * i}s`,
              }}
            />
          )),
        )}

        {/* one rejected dot peeling off at the limiter */}
        <circle
          className="ll-flow-dot ll-flow-dot--reject"
          r={2.5}
          cx={0}
          cy={0}
          style={{
            offsetPath: `path('M ${STAGES[2].x} ${MID_Y} q 20 34 46 52')`,
            animation: "ll-flow 2.6s ease-in infinite",
            animationDelay: "0.9s",
          }}
        />

        {/* nodes */}
        {STAGES.map((stage) => (
          <g key={stage.id}>
            {/* ping ring */}
            <circle
              className="ll-node-ring"
              cx={stage.x}
              cy={MID_Y}
              r={11}
              fill="none"
              stroke="#3ee6b0"
              strokeWidth={1.5}
              style={{ animationDelay: `${STAGES.indexOf(stage) * 0.5}s` }}
            />
            {/* node core */}
            <circle cx={stage.x} cy={MID_Y} r={9} fill="#0b1016" stroke="#3ee6b0" strokeWidth={1.5} />
            <circle cx={stage.x} cy={MID_Y} r={3.2} fill="#3ee6b0" />
            {/* labels */}
            <text x={stage.x} y={MID_Y + 30} textAnchor="middle" className="ll-pipeline__stage-label">
              {stage.label}
            </text>
            <text x={stage.x} y={MID_Y + 44} textAnchor="middle" className="ll-pipeline__stage-sub">
              {stage.sub}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
