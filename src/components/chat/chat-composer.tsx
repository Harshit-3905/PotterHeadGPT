"use client";

import { useState, type FormEvent } from "react";

export function ChatComposer({
  remaining,
  disabled = false,
  onSubmit,
  preset = "",
}: {
  remaining: number;
  disabled?: boolean;
  onSubmit: (message: string) => void;
  preset?: string;
}) {
  const [value, setValue] = useState(preset);
  const locked = disabled || remaining <= 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked) {
      return;
    }
    const message = value.trim();
    if (!message) {
      return;
    }
    onSubmit(message);
    setValue("");
  }

  return (
    <form
      onSubmit={submit}
      className="lectern corner-frame flex items-end gap-3 p-3"
    >
      <label className="sr-only" htmlFor="chat-composer">
        Ask the books
      </label>
      <textarea
        id="chat-composer"
        name="message"
        rows={2}
        value={value}
        disabled={locked}
        placeholder={
          remaining <= 0
            ? "Daily limit reached"
            : "Ask anything about the seven books…"
        }
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-base leading-7 text-parchment placeholder:text-parchment-dim/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={locked || value.trim() === ""}
        className="bg-gold px-5 py-3 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-ink transition-colors hover:bg-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
      >
        Ask
      </button>
    </form>
  );
}
