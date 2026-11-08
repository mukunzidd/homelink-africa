import { getTranslations } from "next-intl/server";
import type { HomeForSale } from "@/lib/domain/types";
import { money } from "@/lib/domain/money";
import { minutesTo, type LandmarkKey } from "@/lib/domain/landmarks";
import { MoneyText } from "@/components/ui/money-text";
import { ShieldIcon } from "@/components/ui/icons";
import { ResultCard, PriceBlock } from "@/components/results/result-card";
import { TravelTime } from "@/components/results/travel-time";
import { RwfFigure } from "@/components/sale/rwf-figure";

/**
 * A home for sale in a result list. The same card as a stay, with the facts a
 * buyer compares on instead: floor area, plot, and the price per square metre,
 * which is how a house in Gacuriro and an apartment in Kiyovu become
 * comparable at all.
 *
 * Against the median: a buyer's first question about a price is "is that a
 * lot", and the median price per m² across what we list is the honest answer
 * we can give. Within 5% says nothing rather than splitting hairs.
 */
export async function SaleRow({
  home,
  medianPerSqm,
  near,
  priority,
  layout = "row",
}: {
  home: HomeForSale;
  /** Minor units of the home's currency, across every home listed. */
  medianPerSqm?: number;
  near?: LandmarkKey;
  priority?: boolean;
  layout?: "row" | "tile";
}) {
  const t = await getTranslations("sale");
  const tListing = await getTranslations("listing");
  const tList = await getTranslations("list");

  const perSqmMinor = Math.round(home.price.minor / home.floorSqm);
  const perSqm = money(perSqmMinor, home.price.currency);
  const delta = medianPerSqm ? Math.round(((perSqmMinor - medianPerSqm) / medianPerSqm) * 100) : 0;
  const landmark = near ?? "cityCentre";

  return (
    <ResultCard
      layout={layout}
      priority={priority}
      href={`/buy/${home.slug}`}
      title={home.name}
      meta={[
        home.neighbourhood,
        tListing("bedrooms", { count: home.bedrooms }),
        t("bathrooms", { count: home.bathrooms }),
        t("floor", { sqm: home.floorSqm }),
        home.plotSqm ? t("plot", { sqm: home.plotSqm.toLocaleString("en") }) : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      summary={layout === "row" ? home.summary : undefined}
      extra={<TravelTime minutes={minutesTo(home.location, landmark)} landmark={landmark} />}
      image={{ seed: home.imageSeed, src: home.images?.[0], count: home.images?.length ?? 0 }}
      save={{ id: home.id, kind: "sale", name: home.name }}
      inspection={home.verification}
      tags={
        <>
          {home.titleChecked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[12px] font-medium text-ink-2">
              <ShieldIcon size={12} className="text-brand" />
              {t("titleChecked")}
            </span>
          )}
          {Math.abs(delta) >= 5 && (
            <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-ink-2">
              {delta < 0 ? tList("belowMedian", { pct: -delta }) : tList("aboveMedian", { pct: delta })}
            </span>
          )}
        </>
      }
      price={
        <PriceBlock
          figure={<MoneyText amount={home.price} rounded />}
          unit={t("askingShort")}
          sub={
            <>
              <RwfFigure amount={home.price} />
              <span className="block">
                <MoneyText amount={perSqm} rounded /> {t("perSqm")}
              </span>
            </>
          }
        />
      }
      cta={t("view")}
    />
  );
}
