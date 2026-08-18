import Link from "next/link";
import { CitedSpecimen } from "@/components/landing/cited-specimen";
import { Constellation } from "@/components/landing/constellation";
import { DustField } from "@/components/landing/dust-field";
import { giltGhost, giltPlate, giltSolid } from "@/components/ui/gilt";

const STEPS = [
  {
    numeral: "I",
    title: "Ask in plain language",
    copy: "A question about the story is enough. No spell names required, though they help.",
  },
  {
    numeral: "II",
    title: "Retrieve the nearest passages",
    copy: "The corpus is searched for the chunks that actually bear on what you asked.",
  },
  {
    numeral: "III",
    title: "Answer with footnotes — or refuse",
    copy: "Citations sit under the reply. If the books do not say, it does not invent.",
  },
];

const STACK = [
  "Next.js",
  "LangChain",
  "Qdrant",
  "Auth.js",
  "Postgres",
  "OpenAI",
];

export function LandingPage() {
  return (
    <div className="relative flex flex-1 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-10 left-6 z-30 hidden w-px bg-linear-to-b from-transparent via-gold/35 to-transparent lg:block"
      />

      <header className="relative z-20 border-b border-ink-edge/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-8">
          <p className="font-display text-xl font-light tracking-tight text-parchment">
            PotterHeadGPT
          </p>
          <Link href="/login" className={giltPlate}>
            Enter the library
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 pb-16 pt-14 sm:px-8 sm:pt-16 lg:pt-20">
          <DustField />
          <Constellation className="pointer-events-none absolute -right-16 top-0 w-[min(90%,38rem)] opacity-40 sm:right-4" />

          <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
            <p className="animate-rise text-[0.68rem] font-medium uppercase tracking-[0.42em] text-gold">
              The Restricted Section
            </p>
            <h1 className="animate-rise mt-5 font-display text-6xl font-light leading-[0.92] tracking-tight text-parchment [animation-delay:90ms] sm:text-8xl lg:text-[6.75rem]">
              PotterHeadGPT
            </h1>
            <div
              aria-hidden="true"
              className="gilt-rule animate-rise mt-8 w-28 [animation-delay:160ms]"
            />
            <p className="animate-rise mt-8 max-w-xl text-balance text-lg leading-8 text-parchment-dim [animation-delay:220ms] sm:text-xl sm:leading-9">
              A reading companion for the seven books. Ask anything about the
              story and every answer comes back with the passages it was drawn
              from.
            </p>
            <div className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-4 [animation-delay:300ms]">
              <Link href="/chat" className={giltSolid}>
                Ask the books
                <span aria-hidden="true" className="text-base leading-none">
                  →
                </span>
              </Link>
              <Link href="/login" className={giltGhost}>
                Continue as guest
              </Link>
            </div>
            <p className="animate-rise mt-7 text-sm leading-6 text-parchment-dim [animation-delay:360ms]">
              Five questions a day. Sign in only if you want the same desk on
              another device.
            </p>
          </div>
        </section>

        <section id="specimen" className="relative px-6 py-20 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.28em] text-gold">
              A page from the stacks
            </p>
            <h2 className="mt-4 font-display text-4xl font-light text-parchment sm:text-5xl">
              The chat, before you enter
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-parchment-dim">
              Same parchment. Same sources under the answer. Open a citation
              here the way you will in the library.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-3xl border border-ink-edge/80 bg-ink/30 px-4 py-10 sm:px-8">
            <CitedSpecimen />
          </div>
        </section>

        <section className="px-6 py-20 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <p className="text-[0.62rem] font-medium uppercase tracking-[0.28em] text-gold">
                How the stacks are read
              </p>
              <h2 className="mt-4 font-display text-4xl font-light text-parchment sm:text-5xl">
                Retrieve, then speak
              </h2>
            </div>
            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((step) => (
                <li key={step.numeral} className="text-center md:text-left">
                  <p className="font-display text-4xl font-light text-gold">
                    {step.numeral}
                  </p>
                  <h3 className="mt-4 font-display text-2xl font-light text-parchment">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-parchment-dim">
                    {step.copy}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-6 pb-24 sm:px-8">
          <div className="corner-frame mx-auto flex max-w-5xl flex-col items-center gap-6 bg-ink-raised/70 px-6 py-10 sm:px-10">
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.28em] text-gold">
              The workbench
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {STACK.map((item) => (
                <li
                  key={item}
                  className="text-[0.72rem] uppercase tracking-[0.2em] text-parchment-dim"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-ink-edge/80 px-6 py-10 sm:px-8">
        <p className="mx-auto max-w-5xl text-sm leading-7 text-parchment-dim">
          PotterHeadGPT is a study companion. It is not affiliated with the
          authors, publishers, or film studios. Bring your own legally obtained
          copies.
        </p>
      </footer>
    </div>
  );
}
