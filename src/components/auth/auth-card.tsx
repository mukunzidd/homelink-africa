import type { ReactNode } from "react";

/** The frame every sign-in screen shares: one narrow card, a title, a line under it, then the form. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5 px-4 py-10 sm:py-16">
      <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">{title}</h1>
          {subtitle && <p className="text-[15px] leading-relaxed text-ink-2">{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer && <div className="flex flex-col items-center gap-2 text-center text-[14px] text-ink-2">{footer}</div>}
    </div>
  );
}

export const authField = "min-h-12 w-full rounded-ctl border border-line bg-surface px-3.5 text-[16px] text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none aria-[invalid=true]:border-crit";
export const authLabel = "flex flex-col gap-1.5 text-[14px] font-medium text-ink-2";
export const authPrimary = "min-h-12 w-full cursor-pointer rounded-ctl bg-brand px-5 text-[16px] font-semibold text-on-brand hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60";
