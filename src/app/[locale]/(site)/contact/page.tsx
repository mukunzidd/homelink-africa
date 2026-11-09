import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { kigaliDay } from "@/lib/domain/instants";
import { ContactForm } from "@/components/help/contact-form";
import { MessageIcon } from "@/components/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("contact"))("title") };
}

const PHONE = "+250788300100";
const EMERGENCY = "+250788300199";

/**
 * A message to the team, or WhatsApp or a call. A guest in the middle of
 * a stay sees the emergency line first, because that is when it is needed.
 */
export default async function Contact({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("contact");
  const role = await currentRole();
  const mine = role === "guest" ? await repos().bookings.listForCurrentUser() : [];
  const today = kigaliDay();
  const staying = mine.find((b) => b.service === "stay" && b.status === "active" && b.startDate <= today && today < b.endDate);
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-10">
      <header className="flex max-w-[720px] flex-col gap-3">
        <h1 className="font-display text-4xl font-semibold text-ink">{t("title")}</h1>
        <p className="text-[17px] text-ink-2">{t("intro")}</p>
      </header>
      {staying && (
        <a href={`tel:${EMERGENCY}`} className="flex flex-col gap-1 rounded-card border-2 border-crit/60 bg-crit-tint/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-col">
            <span className="text-[17px] font-semibold text-crit">{t("emergencyTitle", { home: staying.title })}</span>
            <span className="text-[14px] text-ink-2">{t("emergencyBody")}</span>
          </span>
          <span className="tnum text-[20px] font-semibold text-crit">+250 788 300 199</span>
        </a>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ContactForm signedIn={role === "guest"} references={mine.map((b) => b.reference)} />
        <aside className="flex flex-col gap-3">
          <a href={`https://wa.me/${PHONE.slice(1)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 hover:border-brand">
            <MessageIcon size={20} className="text-brand" />
            <span className="flex flex-col"><span className="font-semibold text-ink">{t("whatsapp")}</span><span className="text-[13px] text-ink-3">{t("whatsappHint")}</span></span>
          </a>
          <a href={`tel:${PHONE}`} className="flex flex-col rounded-card border border-line bg-surface p-4 hover:border-brand">
            <span className="font-semibold text-ink">{t("call")}</span>
            <span className="tnum text-[15px] text-ink-2">+250 788 300 100</span>
            <span className="text-[13px] text-ink-3">{t("hours")}</span>
          </a>
        </aside>
      </div>
    </div>
  );
}
