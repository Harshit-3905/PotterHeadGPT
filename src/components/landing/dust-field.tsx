export function DustField() {
  const motes = [
    { left: "8%", delay: "0s", duration: "18s" },
    { left: "16%", delay: "3s", duration: "22s" },
    { left: "27%", delay: "7s", duration: "16s" },
    { left: "41%", delay: "1.5s", duration: "20s" },
    { left: "53%", delay: "9s", duration: "17s" },
    { left: "62%", delay: "4s", duration: "24s" },
    { left: "74%", delay: "6s", duration: "19s" },
    { left: "86%", delay: "2s", duration: "21s" },
    { left: "93%", delay: "11s", duration: "15s" },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {motes.map((mote) => (
        <span
          key={mote.left}
          className="dust-mote"
          style={{
            left: mote.left,
            bottom: "-8px",
            animationDelay: mote.delay,
            animationDuration: mote.duration,
          }}
        />
      ))}
    </div>
  );
}
