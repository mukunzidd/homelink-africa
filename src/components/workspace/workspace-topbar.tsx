"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Role } from "@/lib/domain/types";
import { sectionOf } from "@/lib/workspace/nav";
import { usePreferences } from "@/lib/preferences/context";
import { useDismissable } from "@/lib/use-dismissable";
import { SmartSearchTrigger } from "@/components/search/smart-search";
import { ChevronDownIcon, ExitIcon, MenuIcon, PlusIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

/**
 * The workspace's top strip: where you are, then the tools that work on any
 * page. 56px, the same height as the sidebar's logo row so the two read as
 * one frame.
 */
export function WorkspaceTopbar({
  role,
  properties,
  onOpenDrawer,
  bell,
}: {
  role: Role;
  /** Admin's property switcher. Empty for everyone else. */
  properties: { id: string; name: string }[];
  onOpenDrawer: () => void;
  /** The notification bell, rendered on the server and passed through. */
  bell?: ReactNode;
}) {
  const t = useTranslations("workspace");
  const pathname = usePathname();
  const section = sectionOf(pathname);
  const staff = role === "ops" || role === "admin";

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-none items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-5">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label={t("openMenu")}
        className="grid size-9 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <MenuIcon size={18} />
      </button>

      <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
        {section ? t(`sections.${section}`) : t("label")}
      </p>

      <div className="flex flex-none items-center gap-1">
        {role === "admin" && properties.length > 0 && <PropertySwitcher properties={properties} />}
        {staff && <SmartSearchTrigger />}
        {bell}
        {staff && <NewMenu role={role} />}
        <WorkspaceAccount role={role} />
      </div>
    </header>
  );
}

/**
 * Admin works across eleven homes; most pages are about one at a time. The
 * choice lives in the URL as `?property=`, so it survives a refresh and a
 * shared link, and every page that cares reads it the same way.
 */
function PropertySwitcher({ properties }: { properties: { id: string; name: string }[] }) {
  const t = useTranslations("workspace");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get("property") ?? "all";

  return (
    <Select
      label={t("propertyLabel")}
      hideLabel
      size="sm"
      value={value}
      className="hidden w-52 md:block"
      options={[
        { value: "all", label: t("allHomes") },
        ...properties.map((p) => ({ value: p.id, label: p.name })),
      ]}
      onChange={(next) => {
        const q = new URLSearchParams(params.toString());
        if (next === "all") q.delete("property");
        else q.set("property", next);
        const qs = q.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      }}
    />
  );
}

function NewMenu({ role }: { role: Role }) {
  const t = useTranslations("workspace");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(ref, open, close);

  const items =
    role === "admin"
      ? [
          { href: "/manage/portfolio?new=1", label: t("newListing") },
          { href: "/manage/calendar?block=1", label: t("newBlock") },
          { href: "/manage/maintenance?new=1", label: t("newTicket") },
          { href: "/manage/incidents?new=1", label: t("newIncident") },
        ]
      : [
          { href: "/manage/maintenance?new=1", label: t("newTicket") },
          { href: "/manage/incidents?new=1", label: t("newIncident") },
        ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-ctl bg-brand pl-2.5 pr-3 text-[14px] font-semibold text-on-brand transition-colors hover:bg-brand-deep"
      >
        <PlusIcon size={15} />
        <span className="hidden sm:inline">{t("new")}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 flex w-60 flex-col rounded-card border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              role="menuitem"
              href={item.href}
              onClick={close}
              className="rounded-inner px-2.5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceAccount({ role }: { role: Role }) {
  const t = useTranslations("workspace");
  const tRoles = useTranslations("roles");
  const { setRole } = usePreferences();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(ref, open, close);
  const initial = tRoles(role).trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-1 rounded-ctl pl-1 pr-1.5 transition-colors",
          open ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-full border border-line bg-brand-tint text-[12px] font-semibold text-brand-deep"
        >
          {initial}
        </span>
        <span className="sr-only">{tRoles(role)}</span>
        <ChevronDownIcon size={13} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 flex w-56 flex-col rounded-card border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]"
        >
          <p className="mb-1 border-b border-line-soft px-2.5 pb-2.5 pt-1.5 text-[13px] font-medium text-ink">
            {tRoles(role)}
          </p>
          <Link
            role="menuitem"
            href="/"
            onClick={close}
            className="flex items-center gap-2 rounded-inner px-2.5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <ExitIcon size={15} />
            {t("backToSite")}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setRole("visitor");
              close();
              router.push("/");
              router.refresh();
            }}
            className="cursor-pointer rounded-inner px-2.5 py-2 text-left text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
