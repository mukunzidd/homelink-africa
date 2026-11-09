"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { sendContact } from "@/app/actions/contact";
import { Caption, control, label, primary } from "@/components/queue/queue-forms";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

const TOPICS = ["booking", "change", "payment", "stay", "renting", "other"] as const;

export function ContactForm({ signedIn, references }: { signedIn: boolean; references: string[] }) {
  const t = useTranslations("contact");
  const pathname = usePathname();
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("booking");
  const [reference, setReference] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { ok: true; conversationId?: string } | { ok: false; reason: string }>(null);
  if (!signedIn) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5">
        <p className="text-[15px] text-ink-2">{t("signInFirst")}</p>
        <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`} className={primary}>{t("signIn")}</Link>
      </div>
    );
  }
  if (result?.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-card border border-brand/40 bg-brand-tint/40 p-5">
        <p className="text-[16px] font-semibold text-ink">{t("sent")}</p>
        <p className="text-[15px] text-ink-2">{t("sentBody")}</p>
        {result.conversationId && <Link href={`/messages?thread=${result.conversationId}`} className="font-semibold text-brand hover:underline">{t("openThread")}</Link>}
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setResult(await sendContact({ topic, reference: reference.trim() || undefined, body }));
        setBusy(false);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Caption text={t("topic")}><Select label={t("topic")} hideLabel value={topic} onChange={(v) => setTopic(v as (typeof TOPICS)[number])} options={TOPICS.map((x) => ({ value: x, label: t(`topics.${x}`) }))} /></Caption>
        <label className={label}>
          {t("reference")}
          <input list="my-refs" value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="HL-4KQ2-8M" aria-invalid={result?.ok === false && result.reason === "reference"} className={cn(control, "font-mono", result?.ok === false && result.reason === "reference" && "border-crit")} />
          <datalist id="my-refs">{references.map((r) => <option key={r} value={r} />)}</datalist>
        </label>
      </div>
      {result?.ok === false && result.reason === "reference" && <p role="alert" className="text-[13px] text-crit">{t("badReference")}</p>}
      <label className={label}>{t("message")}<textarea required rows={6} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} className={cn(control, "py-2.5 leading-relaxed")} /></label>
      {result?.ok === false && result.reason === "empty" && <p role="alert" className="text-[13px] text-crit">{t("empty")}</p>}
      <button type="submit" disabled={busy || !body.trim()} className={cn(primary, "self-start")}>{t("send")}</button>
    </form>
  );
}
