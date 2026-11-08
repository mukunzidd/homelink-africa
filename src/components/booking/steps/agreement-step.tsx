"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { BookingDraft, DraftAction } from "@/lib/booking/draft";
import { Field, StepSection, TextInput } from "../fields";
import { cn } from "@/lib/cn";

/**
 * The rental agreement, read and signed in the flow.
 *
 * "I have read it" stays locked until the last clause has scrolled into
 * view: a tick box beside a document nobody opened is the oldest lie on the
 * web, and this one is about a year of someone's rent. The signature is the
 * typed name, which must match the guest's details, case and spacing aside.
 */
export function AgreementStep({
  draft,
  dispatch,
  attempted,
  clauses,
  heading,
  dateLabel,
}: {
  draft: BookingDraft;
  dispatch: (a: DraftAction) => void;
  attempted: boolean;
  /** The agreement's clauses, worded and formatted on the server. */
  clauses: string[];
  heading: string;
  /** Today, formatted on the server, for the "signed on" line. */
  dateLabel: string;
}) {
  const t = useTranslations("booking.agreement");
  const end = useRef<HTMLParagraphElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(!!draft.agreement);
  const [read, setRead] = useState(!!draft.agreement);
  const [typed, setTyped] = useState(draft.agreement?.signedName ?? "");
  const name = draft.guest.name ?? "";
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const matches = !!name && norm(typed) === norm(name);

  useEffect(() => {
    if (!end.current || !box.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setReachedEnd(true), {
      root: box.current,
      threshold: 1,
    });
    io.observe(end.current);
    return () => io.disconnect();
  }, []);

  // The draft only holds a signature that counts.
  useEffect(() => {
    if (read && matches) dispatch({ type: "sign", signedName: typed, at: new Date().toISOString() });
    else if (draft.agreement) dispatch({ type: "sign", signedName: "", at: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [read, typed, matches]);

  return (
    <StepSection title={t("title")} body={t("body")}>
      <div
        ref={box}
        tabIndex={0}
        aria-label={heading}
        className="max-h-80 overflow-y-auto rounded-ctl border border-line bg-surface-2/40 px-5 py-4 text-[14px] leading-relaxed text-ink-2"
      >
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">{heading}</h3>
        <ol className="flex list-decimal flex-col gap-3 pl-5">
          {/* The parties clause names the tenant from their own details,
              which only the browser has until the booking is placed. */}
          {[t("parties", { tenant: name || "…" }), ...clauses].map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ol>
        <p ref={end} className="mt-4 h-px" aria-hidden="true" />
      </div>
      {!reachedEnd && <p className="-mt-2 text-xs text-ink-3">{t("scrollHint")}</p>}

      <label
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-ctl border px-4 py-2.5 text-[15px] font-medium",
          !reachedEnd ? "cursor-not-allowed border-line text-ink-3" : read ? "cursor-pointer border-brand bg-brand-tint text-brand-deep" : "cursor-pointer border-line text-ink",
        )}
      >
        <input type="checkbox" checked={read} disabled={!reachedEnd} onChange={(e) => setRead(e.target.checked)} className="size-5 flex-none cursor-pointer accent-[var(--brand)] disabled:cursor-not-allowed" />
        {t("read")}
      </label>

      <Field
        label={t("sign")}
        hint={t("signHint", { name })}
        error={attempted && !matches && t("signError", { name })}
        id="signature"
      >
        {(a) => (
          <TextInput
            {...a}
            invalid={a["aria-invalid"]}
            disabled={!read}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="font-display text-[20px] italic disabled:opacity-50"
          />
        )}
      </Field>
      {read && matches && (
        <p className="text-[13px] font-medium text-ok">{t("signed", { name, date: dateLabel })}</p>
      )}
    </StepSection>
  );
}
