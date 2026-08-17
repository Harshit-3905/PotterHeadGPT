import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth/config";
import { LoginActions } from "@/components/auth/login-actions";

export const metadata: Metadata = {
  title: "Sign in \u00b7 PotterHeadGPT",
};

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect("/chat");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <div className="animate-rise w-full max-w-md rounded-2xl border border-ink-edge bg-ink-raised/80 px-8 py-12 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.9)] sm:px-12">
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

        <div
          aria-hidden="true"
          className="mx-auto mt-9 h-px w-16 bg-linear-to-r from-transparent via-gold-deep to-transparent"
        />

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
        className="mt-10 text-xs uppercase tracking-[0.24em] text-parchment-dim transition-colors duration-300 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-bright"
      >
        Back to the entrance
      </Link>
    </main>
  );
}
