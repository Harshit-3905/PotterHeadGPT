import type { UsageStatus } from "@/usage/types";

export function QuotaBanner({ usage }: { usage: UsageStatus }) {
  if (usage.unlimited) {
    return null;
  }

  const copy =
    usage.remaining <= 0
      ? "Daily limit reached. Resets at 00:00 UTC."
      : `${usage.remaining} of ${usage.limit} messages remaining today.`;

  return (
    <p className="text-sm leading-6 text-parchment-dim" role="status">
      {copy}
    </p>
  );
}
