"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { markCheckedIn, markCheckedOut } from "@/app/actions/desk";
import { useToast } from "@/components/notifications/toaster";

/** One tap for the desk's two most frequent writes. */
export function DeskButton({ reference, kind, label, done }: { reference: string; kind: "in" | "out"; label: string; done: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await (kind === "in" ? markCheckedIn(reference) : markCheckedOut(reference));
        toast.show({ title: `${done} · ${reference}`, tone: "ok" });
        router.refresh();
      }}
      className="min-h-9 cursor-pointer rounded-ctl bg-brand px-3 text-[13px] font-semibold text-on-brand hover:bg-brand-deep disabled:opacity-60"
    >
      {label}
    </button>
  );
}
