"use client";

import { useFormStatus } from "react-dom";

/** Submit button that shows progress while a (possibly slow) server action runs. */
export function SubmitButton({
  children,
  pendingText = "Working… keep this page open",
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:opacity-60`}>
      {pending ? pendingText : children}
    </button>
  );
}
