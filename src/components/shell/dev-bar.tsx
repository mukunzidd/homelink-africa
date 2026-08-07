"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePreferences } from "@/lib/preferences/context";
import type { Role } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

const ROLES: Role[] = [
  "visitor",
  "guest",
  "host",
  "driver",
  "guide",
  "ops",
  "admin",
];

/**
 * Mock auth for the clickable shell.
 *
 * Role-gated screens need a way to be reached before accounts exist. This
 * reads and writes the same `usePreferences().role` that will later be fed by
 * Supabase Auth claims, so route guards written against it survive the swap.
 *
 * Never rendered in production.
 */
export function DevBar() {
  const t = useTranslations("dev");
  const tRoles = useTranslations("roles");
  const { role, setRole } = usePreferences();
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-3 rounded-full border border-line",
          "bg-surface/95 px-3 py-1.5 shadow-[var(--shadow-pop)] backdrop-blur",
        )}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-3">
          {t("label")}
        </span>

        <label className="contents">
          <span className="sr-only">{t("role")}</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="cursor-pointer rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tRoles(r)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-full px-2 py-1 text-xs text-ink-3 transition-colors hover:text-ink cursor-pointer"
        >
          {open ? "×" : "?"}
        </button>

        {open && (
          <p className="max-w-[34ch] text-[11px] leading-snug text-ink-3">
            {t("note")}
          </p>
        )}
      </div>
    </div>
  );
}
