import Link from "next/link";

export default function ChatNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-[0.62rem] font-medium uppercase tracking-[0.28em] text-gold">
        The Restricted Section
      </p>
      <h1 className="mt-4 font-display text-4xl font-light text-parchment">
        Thread not found
      </h1>
      <div aria-hidden="true" className="gilt-rule mx-auto mt-7 w-16" />
      <p className="mt-7 max-w-md text-base leading-7 text-parchment-dim">
        That conversation is gone, or it belongs to another reader.
      </p>
      <Link
        href="/chat"
        className="mt-10 bg-gold px-7 py-3.5 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-ink transition-colors hover:bg-gold-bright focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-bright"
      >
        Back to chat
      </Link>
    </div>
  );
}
