export function CitationMark({ ordinal }: { ordinal: number }) {
  return (
    <span
      aria-hidden="true"
      className="mx-0.5 inline-flex translate-y-[-0.08em] items-center bg-gold/15 px-1 py-px text-[0.8em] font-semibold leading-none text-gold-bright"
    >
      [{ordinal}]
    </span>
  );
}
