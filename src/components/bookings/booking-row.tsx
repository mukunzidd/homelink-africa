import { getTranslations } from "next-intl/server";
import type { Booking, Conversation } from "@/lib/domain/types";
import type { SupplyRef } from "@/lib/repos/supply-ref";
import type { StatusTone } from "@/components/ui/status-pill";
import { Link } from "@/i18n/navigation";
import { formatDateRange } from "@/lib/domain/dates";
import { supplierShare } from "@/lib/domain/pricing";
import { SupplyImage } from "@/components/ui/supply-image";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";
import { cn } from "@/lib/cn";

/**
 * One booking, as a row.
 *
 * A hairline row rather than a card, for the same reason the detail pages use
 * rules between sections: a trip is one continuous read, and boxing each
 * booking turns "my November in Kigali" into a pile of unrelated receipts.
 *
 * Every dashboard in this milestone is built out of this component — guest,
 * supply and ops all answer "what is booked, in what state, and who do I talk
 * to about it". They differ in which side of the transaction is named and in
 * what actions hang off the end, not in the shape of the row. Where a role
 * needs an extra fact it goes in `aside`, so the divergence stays visible in
 * one place instead of spreading into three near-copies of this file.
 *
 * `recordHref` is opt-in rather than derived from the booking, and that is the
 * point: a booking record is the guest's own account of their own money, so
 * Trips passes it and Inventory does not. Deriving it here would hand a
 * supplier a link into someone else's confirmation, which is the leak that had
 * to be closed on /trips itself.
 */
const STATUS_TONE: Record<Booking["status"], StatusTone> = {
  draft: "idle",
  confirmed: "ok",
  active: "ok",
  completed: "idle",
  cancelled: "crit",
};

export async function BookingRow({
  booking,
  supply,
  conversation,
  locale,
  /** Extra facts a particular dashboard needs. Rendered under the dates. */
  aside,
  /** Past and cancelled rows recede rather than disappear. */
  muted,
  /** Where this booking's own record lives, for the person it belongs to. */
  recordHref,
  /**
   * Whose side of the money this row is read from. The same held funds are
   * "until you confirm check-in" to the guest and "until the guest checks in"
   * to the host, and the amount that matters to a supplier is what reaches
   * them, not what the guest paid.
   */
  viewer = "guest",
}: {
  booking: Booking;
  supply: SupplyRef | null;
  conversation: Conversation | null;
  locale: string;
  aside?: React.ReactNode;
  muted?: boolean;
  recordHref?: string;
  viewer?: "guest" | "supply";
}) {
  const t = await getTranslations("trips");
  const tConfirm = await getTranslations("confirmation");
  const tStatus = await getTranslations("status");
  const tVerify = await getTranslations("verification");
  const tSearch = await getTranslations("search");
  const tInventory = await getTranslations("inventory");

  const when = formatDateRange(booking.startDate, booking.endDate, locale);
  const name = supply?.name ?? booking.title;

  return (
    <li
      className={cn(
        "flex flex-col gap-4 border-t border-line py-5 sm:flex-row sm:items-start",
        muted && "opacity-70",
      )}
    >
      <SupplyImage
        seed={supply?.imageSeed ?? booking.supplyItemId}
        src={supply?.image}
        alt={name}
        sizes="(max-width: 640px) 100vw, 160px"
        className="h-32 w-full rounded-inner sm:h-24 sm:w-40 sm:flex-none"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={STATUS_TONE[booking.status]}>
            {tStatus(booking.status)}
          </StatusPill>
          {/* Escrow is a state of the money, not of the booking, so it gets its
              own pill rather than replacing the status. A confirmed booking
              whose funds are held is two facts and reads as two. */}
          {booking.escrowHeld && (
            <StatusPill tone="warn">
              {viewer === "supply"
                ? tVerify("escrowShortSupply")
                : tVerify("escrowShort")}
            </StatusPill>
          )}
        </div>

        {/* The title goes to the booking when the reader owns it, and to the
            public listing otherwise. Whichever it is, a row's headline should
            lead somewhere the reader can actually use. */}
        {recordHref || supply ? (
          <Link
            href={recordHref ?? supply!.href}
            className="rounded-ctl text-[17px] font-semibold leading-snug text-ink hover:text-brand"
          >
            {name}
          </Link>
        ) : (
          <p className="text-[17px] font-semibold leading-snug text-ink">{name}</p>
        )}

        <p className="tnum text-sm text-ink-2">
          {when} · {tSearch("guestCount", { count: booking.party })}
          {supply ? ` · ${supply.detail}` : ""}
        </p>

        {aside}

        {recordHref && supply && (
          <Link
            href={supply.href}
            className="w-fit rounded-ctl text-[13px] font-semibold text-brand hover:text-brand-deep"
          >
            {tConfirm("viewListing")}
          </Link>
        )}

        {/* Monospaced, because this is a code people read aloud down a phone
            line to the Kigali office. Proportional digits make 1 and l an
            argument. */}
        <p className="flex items-baseline gap-2 pt-0.5 text-[13px] text-ink-3">
          <span>{t("reference")}</span>
          <span className="font-mono text-ink-2">
            {booking.reference}
          </span>
        </p>
      </div>

      <div className="flex flex-none flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start sm:gap-2">
        {viewer === "supply" ? (
          <span className="flex flex-col sm:items-end">
            <MoneyText
              amount={supplierShare(booking.total, booking.service).net}
              className="text-[17px] font-semibold text-ink"
            />
            <span className="text-[12px] text-ink-3">{tInventory("afterFee")}</span>
          </span>
        ) : (
          <MoneyText
            amount={booking.total}
            className="text-[17px] font-semibold text-ink"
          />
        )}

        {conversation ? (
          <Link
            // Straight at the thread, not the inbox. Messaging has taken a
            // `thread` parameter since it was built; the row was still landing
            // people on a list and asking them to find their own conversation.
            href={`/messages?thread=${conversation.id}`}
            className="flex items-center gap-2 rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
          >
            {t("openThread")}
            {conversation.unreadCount > 0 && (
              <span className="tnum grid size-5 place-items-center rounded-full bg-brand text-[11px] font-semibold text-on-brand">
                {conversation.unreadCount}
              </span>
            )}
          </Link>
        ) : (
          // No thread yet is worth saying. A row that simply omits the link
          // reads as a missing feature rather than as "nothing has been said
          // about this one".
          <span className="text-[13px] text-ink-3">{t("noThread")}</span>
        )}
      </div>
    </li>
  );
}
