import { getTranslations } from "next-intl/server";
import type { Listing } from "@/lib/domain/types";
import { PersonRow } from "@/components/ui/person-row";

/**
 * Who hosts the home, said once and plainly: HomeLink, through a named
 * person on the team.
 *
 * Sits under the inspector row. The two are different promises: the
 * inspector vouches that the place is what the page says; the manager is who
 * answers when the water stops. Neutral disc, because the trust ring belongs
 * to the inspector (see `PersonRow`).
 */
export async function HostedBy({ manager }: { manager: Listing["propertyManager"] }) {
  const t = await getTranslations("detail");
  return (
    <PersonRow
      name={manager.name}
      title={t("hostedByHomeLink")}
      detail={t("managedBy", { name: manager.name, year: manager.since.slice(0, 4) })}
      tone="neutral"
    />
  );
}
