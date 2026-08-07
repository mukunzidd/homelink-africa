import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Product & UX §4: intent doors sit ON TOP OF a browsable feed. They are a
 * helpful hint, not a gate — someone who just wants to scroll listings can
 * ignore them entirely, which is why the feed renders directly below without
 * requiring a choice here.
 */
const DOORS = [
  { key: "arriving", href: "/trip/start" },
  { key: "home", href: "/stays?band=long" },
  { key: "car", href: "/cars" },
  { key: "explore", href: "/experiences" },
] as const;

export async function IntentDoors() {
  const t = await getTranslations("doors");
  const tLanding = await getTranslations("landing");

  return (
    <section aria-labelledby="doors-heading" className="flex flex-col gap-4">
      <h2
        id="doors-heading"
        className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3"
      >
        {tLanding("doorsLabel")}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DOORS.map((door) => (
          <Link
            key={door.key}
            href={door.href}
            className="group flex flex-col gap-2 rounded-card border border-line bg-surface p-5 transition-colors duration-150 hover:border-brand hover:bg-brand-tint"
          >
            <span className="font-display text-lg font-semibold leading-snug text-ink">
              {t(`${door.key}.title`)}
            </span>
            <span className="text-sm leading-relaxed text-ink-2">
              {t(`${door.key}.body`)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
