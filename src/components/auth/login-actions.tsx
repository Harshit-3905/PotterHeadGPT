"use client";

import { signIn } from "next-auth/react";
import { useRef, useState } from "react";

type Provider = "guest" | "google";

export type LoginNavigate = (url: string) => void;

const PENDING_MESSAGE: Record<Provider, string> = {
  guest: "Opening a guest session\u2026",
  google: "Handing you to Google\u2026",
};

const FAILURE_MESSAGE = "That sign-in did not go through. Please try again.";

const BUTTON_BASE =
  "inline-flex w-full items-center justify-center rounded-full px-8 py-4 text-sm font-medium uppercase tracking-[0.18em] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-bright disabled:cursor-not-allowed disabled:opacity-60";

function defaultNavigate(url: string) {
  window.location.assign(url);
}

export function LoginActions({
  navigate = defaultNavigate,
}: {
  navigate?: LoginNavigate;
}) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [failed, setFailed] = useState(false);
  const submitting = useRef(false);

  async function start(provider: Provider) {
    if (submitting.current) {
      return;
    }

    submitting.current = true;
    setPending(provider);
    setFailed(false);

    try {
      const result = await signIn(provider, {
        redirect: false,
        redirectTo: provider === "google" ? "/auth/complete" : "/chat",
      });

      if (result?.ok && result.url) {
        navigate(result.url);
        return;
      }

      submitting.current = false;
      setPending(null);
      setFailed(true);
    } catch {
      submitting.current = false;
      setPending(null);
      setFailed(true);
    }
  }

  const message = pending
    ? PENDING_MESSAGE[pending]
    : failed
      ? FAILURE_MESSAGE
      : "";

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => void start("guest")}
        disabled={pending !== null}
        aria-busy={pending === "guest"}
        className={`${BUTTON_BASE} bg-gold text-ink hover:bg-gold-bright`}
      >
        Continue as Guest
      </button>

      <button
        type="button"
        onClick={() => void start("google")}
        disabled={pending !== null}
        aria-busy={pending === "google"}
        className={`${BUTTON_BASE} border border-gold/60 text-parchment hover:border-gold hover:bg-gold/10`}
      >
        Continue with Google
      </button>

      <p
        role="status"
        className="min-h-5 text-center text-sm leading-5 text-parchment-dim"
      >
        {message}
      </p>
    </div>
  );
}
