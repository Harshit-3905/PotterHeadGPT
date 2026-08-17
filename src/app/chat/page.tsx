import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth/config";

export const metadata: Metadata = {
  title: "Chat \u00b7 PotterHeadGPT",
};

export default async function ChatPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { isGuest, name, email } = session.user;
  const identity = isGuest ? "Guest session" : (name ?? email ?? "Signed in");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-ink-edge px-6 py-5 sm:px-10">
        <h1 className="font-display text-2xl font-light tracking-tight text-parchment">
          PotterHeadGPT
        </h1>

        <p className="rounded-full border border-gold/40 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-gold">
          {identity}
        </p>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="max-w-md text-center">
          <h2 className="font-display text-3xl font-light leading-tight text-parchment">
            Nothing asked yet
          </h2>

          <div
            aria-hidden="true"
            className="mx-auto mt-7 h-px w-16 bg-linear-to-r from-transparent via-gold-deep to-transparent"
          />

          <p className="mt-7 text-base leading-7 text-parchment-dim">
            This is where your conversations with the books will live.
          </p>
        </div>
      </main>
    </div>
  );
}
