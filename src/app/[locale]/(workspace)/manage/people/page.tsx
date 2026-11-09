import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { formatAgo } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatusPill } from "@/components/ui/status-pill";
import { InviteForm, StaffControls } from "@/components/workspace/admin-forms";
import { cn } from "@/lib/cn";

/** Everyone who signs in to the workspace: invite, change a role, switch someone off. There is always an admin. */
export default async function People({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("people");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("workspace.admin");
  const intl = INTL_LOCALES[locale as Locale];
  const staff = await repos().admin.staff();
  const now = new Date();
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("people")} description={t("peopleBody")} />
      <InviteForm />
      <ul className="flex flex-col rounded-card border border-line bg-surface">
        {staff.map((m) => (
          <li key={m.id} className={cn("flex flex-wrap items-center gap-3 border-t border-line-soft px-4 py-3 first:border-0", m.status === "deactivated" && "opacity-60")}>
            <span aria-hidden className="grid size-9 flex-none place-items-center rounded-full bg-brand-tint text-[13px] font-semibold text-brand-deep">{m.name.split(/[\s.]+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join("").toUpperCase()}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-semibold text-ink">{m.name}</span>
              <span className="truncate text-[13px] text-ink-3">{m.email}</span>
            </span>
            <span className="flex flex-col items-end gap-1 text-[12.5px] text-ink-3 sm:w-40">
              <StatusPill tone={m.status === "active" ? "ok" : m.status === "invited" ? "warn" : "idle"}>{t(`status.${m.status}`)}</StatusPill>
              <span>{m.lastActiveAt ? t("lastActive", { when: formatAgo(m.lastActiveAt, now, intl) }) : t("neverSignedIn")}</span>
            </span>
            <span className="w-full sm:w-auto"><StaffControls id={m.id} role={m.role} status={m.status} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
