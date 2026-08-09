import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import type { ServiceKind, VerificationRecord } from "@/lib/domain/types";
import type { Money } from "@/lib/domain/money";
import { sum } from "@/lib/domain/money";
import { addDays, formatDate, today } from "@/lib/domain/dates";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { ROLE_COOKIE, parseRole, supplyLaneFor } from "@/lib/preferences/role";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";

/**
 * The same page, seen by the person who supplies it.
 *
 * A host arriving at their own listing was reading a sales pitch aimed at
 * somebody else — the summary, the highlights, the reasons to book. What they
 * came for is different and shorter: is it booked, what is it earning, and when
 * did somebody last walk through it.
 *
 * It sits above the title rather than below the fold, because the first thing
 * this reader needs to know is that they are looking at their own listing. The
 * guest's page is left completely intact underneath — a supplier checking how
 * their place is being sold is a real reason to visit, and replacing the page
 * with a management screen would take that away.
 *
 * On what "manage" means here. Nothing in this milestone writes, and a dead
 * "Edit listing" button next to a live rate would be worse than none — the same
 * argument the ops queue makes about releasing money. It is also not the
 * product yet: §9 fast-follow #4 has owner onboarding running offline, so in V1
 * a change genuinely does go through the concierge. The band says that and puts
 * the thread one click away, which is the honest version of a save button.
 */
export async function SupplyOwnerBand({
  kind,
  supplyItemId,
  rate,
  rateLabel,
  /** Units free, or the group cap for a day out. */
  availability,
  record,
}: {
  kind: ServiceKind;
  supplyItemId: string;
  rate: Money;
  rateLabel: string;
  availability?: string;
  record: VerificationRecord;
}) {
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  // Only the lane's own supplier. Ops has the queue; a guest has no business
  // here at all.
  if (supplyLaneFor(role) !== kind) return null;

  const t = await getTranslations("owner");
  const tVerify = await getTranslations("verification");
  const intlLocale = INTL_LOCALES[(await getLocale()) as Locale];

  const now = today();
  const bookings = (await repos().bookings.listForCurrentUser()).filter(
    (b) => b.supplyItemId === supplyItemId,
  );
  const upcoming = bookings.filter(
    (b) => b.endDate >= now && b.status !== "cancelled",
  );
  const coming = sum(upcoming.map((b) => b.total), "RWF");

  // Ten months, not twelve. A re-walk that is booked the week it expires is a
  // listing that spends a week unverified, and the badge is the product.
  const dueForRewalk = record.inspectedAt < addDays(now, -305);

  return (
    <section
      aria-label={t("label")}
      className="rounded-card border border-brand/30 bg-brand-tint/40 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="font-display text-lg font-semibold text-ink">
          {t(`title.${kind}`)}
        </h2>
        {dueForRewalk && <StatusPill tone="warn">{t("dueForRewalk")}</StatusPill>}
      </div>

      <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-4">
        <Facts label={rateLabel}>
          <MoneyText amount={rate} className="text-[17px] font-bold text-ink" />
        </Facts>

        <Facts label={t("bookedNow")}>
          <span className="tnum text-[17px] font-bold text-ink">
            {upcoming.length}
          </span>
        </Facts>

        <Facts label={t("coming")}>
          <MoneyText amount={coming} className="text-[17px] font-bold text-ink" />
        </Facts>

        {availability && (
          <Facts label={t("free")}>
            <span className="text-[17px] font-bold text-ink">{availability}</span>
          </Facts>
        )}
      </dl>

      <p className="mt-4 border-t border-brand/20 pt-3 text-[13px] leading-relaxed text-ink-2">
        {tVerify("inspectedBy", {
          name: record.inspectorName,
          date: formatDate(record.inspectedAt, intlLocale),
        })}
        {dueForRewalk ? ` — ${t("rewalkNote")}` : ""}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href="/inventory"
          className="rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
        >
          {t("seeInInventory")}
        </Link>
        <Link
          href="/messages"
          className="rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
        >
          {t("askToChange")}
        </Link>
      </div>

      {/* Said once, plainly. A supplier who expects an edit form and does not
          find one should be told why, not left hunting for it. */}
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
        {t("changesNote")}
      </p>
    </section>
  );
}

function Facts({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
