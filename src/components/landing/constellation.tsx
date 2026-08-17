export function Constellation({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 720 420"
      className={className}
      fill="none"
    >
      <g stroke="rgba(201,168,106,0.28)" strokeWidth="0.7">
        <path d="M86 310 L168 214 L248 248 L332 126 L418 188 L512 96 L604 154" />
        <path d="M168 214 L214 92" />
        <path d="M332 126 L298 48" />
        <path d="M418 188 L476 262" />
      </g>
      {[
        [86, 310, 2.2],
        [168, 214, 1.6],
        [214, 92, 2.8],
        [248, 248, 1.4],
        [298, 48, 1.8],
        [332, 126, 2.4],
        [418, 188, 1.7],
        [476, 262, 1.3],
        [512, 96, 2.1],
        [604, 154, 1.9],
      ].map(([x, y, r]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={r}
          fill="rgba(232,205,148,0.72)"
        />
      ))}
    </svg>
  );
}
