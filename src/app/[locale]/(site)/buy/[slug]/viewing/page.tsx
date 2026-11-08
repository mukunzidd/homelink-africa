import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { viewingSlots } from "@/lib/domain/viewing-slots";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SupplyImage } from "@/components/ui/supply-image";
import { MoneyText } from "@/components/ui/money-text";
import { ViewingForm } from "@/components/sale/viewing-form";

export async function generateMetadata() {
  const t = await getTranslations("booking.viewing");
  return { title: t("title") };
}

/** Booking a viewing of a home for sale. Three weeks of free slots, from tomorrow. */
export default async function BookViewing({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const home = await repos().sales.bySlug(slug);
  if (!home) notFound();
  const [t, tB] = await Promise.all([getTranslations("booking.viewing"), getTranslations("breadcrumb")]);
  const intl = INTL_LOCALES[locale as Locale];
  const tomorrow = new Date(Date.parse(`${kigaliDay()}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const days = viewingSlots(tomorrow, 21, await repos().viewings.taken(home.id)).map((d) => ({
    ...d,
    label: formatDate(d.date, intl, { weekday: "short", day: "numeric", month: "short" }),
  }));

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumbs trail={[{ label: tB("buy"), href: "/buy" }, { label: home.name, href: `/buy/${slug}` }, { label: t("title") }]} />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{t("title")}</h1>
            <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{t("intro")}</p>
          </div>
          <ViewingForm saleId={home.id} slug={slug} days={days} />
        </div>
        <aside className="hidden overflow-hidden rounded-card border border-line bg-surface shadow-[var(--shadow-card)] lg:sticky lg:top-[calc(var(--header-offset)+24px)] lg:block">
          <SupplyImage seed={home.imageSeed} src={home.images?.[0]} alt={home.name} sizes="360px" className="h-44" />
          <div className="flex flex-col gap-1 p-5">
            <p className="text-[16px] font-semibold text-ink">{home.name}</p>
            <p className="text-[13px] text-ink-3">
              {home.neighbourhood}, {home.city}
            </p>
            <MoneyText amount={home.price} className="mt-2 text-xl font-semibold text-ink" />
          </div>
        </aside>
      </div>
    </div>
  );
}
