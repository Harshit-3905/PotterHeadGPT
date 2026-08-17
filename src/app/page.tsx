import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="flex max-w-2xl flex-col items-center text-center">
        <p className="animate-rise text-[0.7rem] font-medium uppercase tracking-[0.42em] text-gold">
          The Restricted Section
        </p>

        <h1 className="animate-rise mt-6 font-display text-5xl font-light leading-[1.05] tracking-tight text-parchment [animation-delay:90ms] sm:text-7xl">
          PotterHeadGPT
        </h1>

        <div
          aria-hidden="true"
          className="animate-rise mt-8 h-px w-24 bg-linear-to-r from-transparent via-gold-deep to-transparent [animation-delay:160ms]"
        />

        <p className="animate-rise mt-8 max-w-xl text-balance text-lg leading-8 text-parchment-dim [animation-delay:220ms]">
          A reading companion for the seven books. Ask anything about the story
          and every answer comes back with the passages it was drawn from.
        </p>

        <Link
          href="/chat"
          className="group animate-rise mt-12 inline-flex items-center gap-3 rounded-full bg-gold px-8 py-4 text-sm font-medium uppercase tracking-[0.18em] text-ink transition-colors duration-300 [animation-delay:300ms] hover:bg-gold-bright focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-bright"
        >
          Start a conversation
          <span
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            &rarr;
          </span>
        </Link>

        <p className="animate-rise mt-8 text-sm leading-6 text-parchment-dim [animation-delay:360ms]">
          Continue as a guest, or sign in with Google for an account of your
          own.
        </p>
      </div>
    </main>
  );
}
