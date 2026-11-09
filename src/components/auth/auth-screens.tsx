"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, LOCALE_LABELS, type Locale } from "@/i18n/routing";
import type { Role } from "@/lib/domain/types";
import { usePreferences } from "@/lib/preferences/context";
import { homeFor } from "@/lib/workspace/nav";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { AuthCard, authField, authLabel, authPrimary } from "./auth-card";
import { OtpInput } from "./otp-input";
import { ProviderButtons } from "./provider-buttons";
import { useCompleteSignIn, useNextQuery } from "./use-sign-in";
import { cn } from "@/lib/cn";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Rwandan numbers without the +250 are 9 digits starting 7; anything with a + is taken as international. */
const phoneOk = (p: string) => /^\+?\d[\d\s]{7,16}$/.test(p.trim()) && p.replace(/\D/g, "").length >= 9;

function Or() {
  const t = useTranslations("auth");
  return (
    <p className="flex items-center gap-3 text-[13px] text-ink-3">
      <span aria-hidden className="h-px flex-1 bg-line" />
      {t("or")}
      <span aria-hidden className="h-px flex-1 bg-line" />
    </p>
  );
}

/** Sign in by phone (a code) or by email (a password or a link), or with Google or Apple. */
export function SignInScreen() {
  const t = useTranslations("auth");
  const router = useRouter();
  const nq = useNextQuery();
  const { finish } = useCompleteSignIn();
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const qs = (extra: string) => `?${[extra, nq].filter(Boolean).join("&")}`;

  return (
    <AuthCard
      title={t("signInTitle")}
      subtitle={t("signInBody")}
      footer={
        <>
          <span>{t("noAccount")} <Link href={`/sign-up${nq ? `?${nq}` : ""}`} className="font-semibold text-brand hover:underline">{t("createOne")}</Link></span>
          <StaffPreview />
        </>
      }
    >
      <div role="tablist" aria-label={t("signInWith")} className="grid grid-cols-2 gap-1 rounded-ctl bg-surface-2 p-1">
        {(["phone", "email"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setTried(false); }} className={cn("min-h-10 cursor-pointer rounded-inner text-[14px] font-semibold", tab === k ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2")}>
            {t(`tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === "phone" ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (phoneOk(phone)) router.push(`/verify${qs(`to=${encodeURIComponent(phone.trim())}`)}`);
          }}
        >
          <label className={authLabel}>
            {t("phone")}
            <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+250 788 123 456" aria-invalid={tried && !phoneOk(phone)} className={authField} />
            {tried && !phoneOk(phone) && <span className="text-[13px] font-normal text-crit">{t("phoneInvalid")}</span>}
          </label>
          <button type="submit" className={authPrimary}>{t("sendCode")}</button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (EMAIL.test(email) && password.length >= 8) finish();
          }}
        >
          <label className={authLabel}>
            {t("email")}
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={tried && !EMAIL.test(email)} className={authField} />
            {tried && !EMAIL.test(email) && <span className="text-[13px] font-normal text-crit">{t("emailInvalid")}</span>}
          </label>
          <label className={authLabel}>
            <span className="flex items-baseline justify-between">
              {t("password")}
              <Link href={`/forgot${nq ? `?${nq}` : ""}`} className="text-[13px] font-semibold text-brand hover:underline">{t("forgot")}</Link>
            </span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={tried && password.length < 8} className={authField} />
            {tried && password.length < 8 && <span className="text-[13px] font-normal text-crit">{t("passwordShort")}</span>}
          </label>
          <button type="submit" className={authPrimary}>{t("signIn")}</button>
          <button
            type="button"
            onClick={() => {
              setTried(true);
              if (EMAIL.test(email)) router.push(`/check-email${qs(`to=${encodeURIComponent(email.trim())}`)}`);
            }}
            className="min-h-11 cursor-pointer rounded-ctl text-[15px] font-semibold text-brand hover:bg-brand-tint"
          >
            {t("sendLink")}
          </button>
        </form>
      )}
      <Or />
      <ProviderButtons />
    </AuthCard>
  );
}

/** Name, a phone or an email, the language to write to them in, and the terms. Then a code. */
export function SignUpScreen() {
  const t = useTranslations("auth");
  const router = useRouter();
  const nq = useNextQuery();
  const pathname = usePathname();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [lang, setLang] = useState<Locale>(routing.defaultLocale);
  const [terms, setTerms] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    const l = document.documentElement.lang as Locale;
    if (routing.locales.includes(l)) setLang(l); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname]);
  const contactOk = EMAIL.test(contact) || phoneOk(contact);
  const ok = name.trim().length >= 2 && contactOk && terms;
  return (
    <AuthCard title={t("signUpTitle")} subtitle={t("signUpBody")} footer={<span>{t("haveAccount")} <Link href={`/sign-in${nq ? `?${nq}` : ""}`} className="font-semibold text-brand hover:underline">{t("signIn")}</Link></span>}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (ok) router.push(`/verify?${[`to=${encodeURIComponent(contact.trim())}`, `new=1`, nq].filter(Boolean).join("&")}`, { locale: lang });
        }}
      >
        <label className={authLabel}>
          {t("name")}
          <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={tried && name.trim().length < 2} className={authField} />
        </label>
        <label className={authLabel}>
          {t("phoneOrEmail")}
          <input autoComplete="username" value={contact} onChange={(e) => setContact(e.target.value)} aria-invalid={tried && !contactOk} placeholder="+250 788 123 456" className={authField} />
          {tried && !contactOk && <span className="text-[13px] font-normal text-crit">{t("contactInvalid")}</span>}
        </label>
        <div className={authLabel}>
          <span aria-hidden="true">{t("language")}</span>
          <Select label={t("language")} hideLabel value={lang} onChange={(v) => setLang(v as Locale)} className="[&_[role=combobox]]:min-h-12" options={routing.locales.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))} />
        </div>
        <label className={cn("flex cursor-pointer items-start gap-3 text-[14px] text-ink-2", tried && !terms && "text-crit")}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} aria-invalid={tried && !terms} className="mt-0.5 size-5 accent-[var(--brand)]" />
          <span>
            {t.rich("terms", {
              terms: (c) => <Link href="/legal/terms" className="font-semibold text-brand underline-offset-2 hover:underline">{c}</Link>,
              privacy: (c) => <Link href="/legal/privacy" className="font-semibold text-brand underline-offset-2 hover:underline">{c}</Link>,
            })}
          </span>
        </label>
        <button type="submit" className={authPrimary}>{t("continue")}</button>
      </form>
      <Or />
      <ProviderButtons />
    </AuthCard>
  );
}

/**
 * Six boxes, a resend after thirty seconds, and a wrong code said plainly.
 * In the preview 000000 is the wrong code and anything else goes through.
 */
export function VerifyScreen() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const { finish } = useCompleteSignIn();
  const to = params.get("to") ?? "";
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [wait, setWait] = useState(30);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);
  function check(v: string) {
    if (v.length < 6) return;
    if (v === "000000") return setWrong(true);
    finish();
  }
  return (
    <AuthCard title={t("verifyTitle")} subtitle={to ? t("verifyBody", { to }) : t("verifyBodyNone")}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); check(code); }}>
        <OtpInput label={t("codeLabel")} value={code} invalid={wrong} onChange={(v) => { setCode(v); setWrong(false); if (v.length === 6) check(v); }} />
        {wrong && <p role="alert" className="text-[14px] text-crit">{t("wrongCode")}</p>}
        <button type="submit" disabled={code.length < 6} className={authPrimary}>{t("verify")}</button>
      </form>
      <div className="flex flex-col items-center gap-1 text-[14px]">
        {wait > 0 ? (
          <p className="tnum text-ink-3">{t("resendIn", { s: wait })}</p>
        ) : (
          <button type="button" onClick={() => { setWait(30); setSent(true); setCode(""); setWrong(false); }} className="cursor-pointer font-semibold text-brand hover:underline">{t("resend")}</button>
        )}
        {sent && wait > 0 && <p role="status" className="text-ink-2">{t("resent")}</p>}
        <p className="text-[12.5px] text-ink-3">{t("previewCode")}</p>
      </div>
    </AuthCard>
  );
}

export function ForgotScreen() {
  const t = useTranslations("auth");
  const router = useRouter();
  const nq = useNextQuery();
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  return (
    <AuthCard title={t("forgotTitle")} subtitle={t("forgotBody")} footer={<Link href={`/sign-in${nq ? `?${nq}` : ""}`} className="font-semibold text-brand hover:underline">{t("backToSignIn")}</Link>}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setTried(true); if (EMAIL.test(email)) router.push(`/check-email?${[`to=${encodeURIComponent(email.trim())}`, "reset=1", nq].filter(Boolean).join("&")}`); }}>
        <label className={authLabel}>
          {t("email")}
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={tried && !EMAIL.test(email)} className={authField} />
          {tried && !EMAIL.test(email) && <span className="text-[13px] font-normal text-crit">{t("emailInvalid")}</span>}
        </label>
        <button type="submit" className={authPrimary}>{t("sendReset")}</button>
      </form>
    </AuthCard>
  );
}

/** The link is in their inbox. In the preview, a button stands in for opening it. */
export function CheckEmailScreen() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const { finish } = useCompleteSignIn();
  const nq = useNextQuery();
  const reset = params.get("reset") === "1";
  return (
    <AuthCard title={t("checkTitle")} subtitle={t(reset ? "checkResetBody" : "checkBody", { to: params.get("to") ?? "" })} footer={<Link href={`/sign-in${nq ? `?${nq}` : ""}`} className="font-semibold text-brand hover:underline">{t("backToSignIn")}</Link>}>
      <p className="text-[14px] text-ink-3">{t("checkHint")}</p>
      <button type="button" onClick={finish} className={cn(authPrimary, "bg-surface-2 text-ink hover:bg-brand-tint")}>{t("openLink")}</button>
    </AuthCard>
  );
}

const STAFF: Role[] = ["ops", "admin", "driver", "guide"];

/**
 * The preview has no staff accounts, so trying the workspace means
 * picking a role. Labelled as a preview tool, so nobody takes it for the
 * real staff sign-in.
 */
export function StaffPreview() {
  const t = useTranslations("auth");
  const tRoles = useTranslations("roles");
  const { setRole } = usePreferences();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="cursor-pointer text-[13px] text-ink-3 underline-offset-2 hover:text-ink hover:underline">{t("workHere")}</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("staffTitle")} description={t("staffBody")} size="sm">
        <div className="grid grid-cols-2 gap-2 pb-2">
          {STAFF.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                router.push(homeFor(r) ?? "/");
                router.refresh();
              }}
              className="min-h-12 cursor-pointer rounded-ctl border border-line bg-surface px-3 text-[14px] font-semibold text-ink hover:border-brand"
            >
              {tRoles(r)}
            </button>
          ))}
        </div>
      </Dialog>
    </>
  );
}
