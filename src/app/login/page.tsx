import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth/config";
import { LoginActions } from "@/components/auth/login-actions";
import { Constellation } from "@/components/landing/constellation";

export const metadata: Metadata = {
  title: "Sign in \u00b7 PotterHeadGPT",
};

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect("/chat");
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20">
      <Constellation className="pointer-events-none absolute -right-16 top-10 w-[min(100%,36rem)] opacity-50" />

      <div className="corner-frame relative z-10 w-full max-w-md bg-ink-raised/90 px-8 py-12 sm:px-12">
        <p className="text-center text-[0.65rem] font-medium uppercase tracking-[0.42em] text-gold">
          PotterHeadGPT
        </p>

        <h1 className="mt-5 text-center font-display text-4xl font-light leading-tight tracking-tight text-parchment">
          Enter the library
        </h1>

        <p className="mt-4 text-center text-base leading-7 text-parchment-dim">
          Choose how you would like to read. Either way you land straight in the
          chat.
        </p>

        <div aria-hidden="true" className="gilt-rule mx-auto mt-9 w-16" />

        <div className="mt-9">
          <LoginActions />
        </div>

        <p className="mt-8 text-center text-sm leading-6 text-parchment-dim">
          A guest gets a saved conversation history straight away. Google adds
          an account you can come back to.
        </p>
      </div>

      <Link
        href="/"
        className="relative z-10 mt-10 text-[0.62rem] uppercase tracking-[0.24em] text-parchment-dim transition-colors duration-300 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-bright"
      >
        Back to the entrance
      </Link>
    </main>
  );
}
