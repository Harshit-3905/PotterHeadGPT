import Link from "next/link";

export default function ChatNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-light text-parchment">
        Thread not found
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-parchment-dim">
        That conversation is gone, or it belongs to another reader.
      </p>
      <Link
        href="/chat"
        className="mt-8 rounded-full bg-gold px-6 py-3 text-xs font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:bg-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
      >
        Back to chat
      </Link>
    </div>
  );
}
