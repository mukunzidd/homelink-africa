"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePreferences } from "@/lib/preferences/context";
import type { Role } from "@/lib/domain/types";
import { Select } from "@/components/ui/select";
import { CloseIcon, PinIcon, PlaneIcon, SlidersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Two controls that were in the way, moved out of it.
 *
 * The segment toggle sat in the header beside language and currency, which
 * gave a preference that changes *what the product does* — currency and
 * payment rail — the same weight as one that only changes how it reads. And
 * the role switcher floated across the middle of every page.
 *
 * Both now live in one corner-anchored bar that collapses to a single icon.
 * Product & UX §4 still holds: the segment override stays visible and
 * persistent, never buried in a settings page. A corner is not buried — it is
 * one click away and always in the same place.
 */
const ROLES: Role[] = [
  "visitor",
  "guest",
  "host",
  "driver",
  "guide",
  "ops",
  "admin",
];

const STORAGE_KEY = "homelink.previewBar.open";

export function PreviewBar() {
  const t = useTranslations("dev");
  const tRoles = useTranslations("roles");
  const tSegment = useTranslations("segment");
  const { segment, setSegment, role, setRole } = usePreferences();

  // Starts collapsed. Anything pinned over the page should have to earn its
  // space, and most sessions never touch these.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle(next: boolean) {
    setOpen(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  const segments = [
    { value: "abroad", label: tSegment("abroad"), icon: <PlaneIcon size={14} /> },
    { value: "rwanda", label: tSegment("rwanda"), icon: <PinIcon size={14} /> },
  ] as const;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => toggle(true)}
        aria-label={t("label")}
        title={t("label")}
        className={cn(
          "fixed bottom-4 right-4 z-40 grid size-10 cursor-pointer place-items-center",
          "rounded-full border border-line bg-surface/95 text-ink-3 backdrop-blur",
          "shadow-[var(--shadow-card)] transition-colors duration-150",
          "hover:text-ink hover:shadow-[var(--shadow-pop)]",
        )}
      >
        <SlidersIcon size={17} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-3",
        "rounded-card border border-line bg-surface/95 p-2 pl-3 backdrop-blur",
        "shadow-[var(--shadow-pop)]",
      )}
    >
      <div
        role="group"
        aria-label={tSegment("label")}
        className="flex items-center rounded-ctl border border-line p-0.5"
      >
        {segments.map((option) => {
          const active = segment === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setSegment(option.value)}
              className={cn(
                "flex h-8 cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5",
                "text-[13px] font-semibold transition-colors duration-150",
                active ? "bg-brand-tint text-brand" : "text-ink-3 hover:text-ink",
              )}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>

      {process.env.NODE_ENV !== "production" && (
        <Select
          label={t("role")}
          hideLabel
          size="sm"
          value={role}
          onChange={(next) => setRole(next as Role)}
          options={ROLES.map((r) => ({ value: r, label: tRoles(r) }))}
          className="w-[9.5rem]"
        />
      )}

      <button
        type="button"
        onClick={() => toggle(false)}
        aria-label={tSegment("hint")}
        className={cn(
          "grid size-8 flex-none cursor-pointer place-items-center rounded-full",
          "text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
        )}
      >
        <CloseIcon size={15} />
      </button>
    </div>
  );
}
