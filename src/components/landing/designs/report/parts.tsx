import { initials } from "@/components/results/inspected-by";
import { Link } from "@/i18n/navigation";
import { ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * The inspector's rubber stamp: a double ring in the trust ink with their
 * initials, set a few degrees off square the way a hand stamp lands. It
 * appears only beside something a named person has inspected, so on this
 * page the stamp itself means "verified" without a badge saying so. The
 * name is always in the text next to it, so the stamp is hidden from
 * screen readers.
 */
export function Stamp({ name, date, size = "sm", className }: { name: string; date?: string; size?: "sm" | "lg"; className?: string }) {
  const lg = size === "lg";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid flex-none place-items-center rounded-full border-[1.5px] border-trust text-trust",
        lg ? "size-24 -rotate-[8deg]" : "size-8 -rotate-6",
        className,
      )}
    >
      {lg && <span className="absolute inset-1 rounded-full border border-trust/60" />}
      <span className="flex flex-col items-center leading-none">
        <span className={cn("font-display font-semibold", lg ? "text-[28px] tracking-wide" : "text-[11px] tracking-wide")}>{initials(name)}</span>
        {lg && date && <span className="tnum mt-1 font-mono text-[11px]">{date}</span>}
      </span>
    </span>
  );
}

/**
 * A numbered section head, set like a report: a heavy rule, the section
 * number in mono, the title in the display serif, and one line of standfirst.
 */
export function SectionHead({
  id,
  n,
  title,
  body,
  href,
  link,
}: {
  id: string;
  n: number;
  title: string;
  body?: string;
  href?: string;
  link?: string;
}) {
  return (
    <header className="flex flex-col gap-4 border-t-2 border-ink pt-4 sm:pt-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="tnum font-mono text-[13px] text-ink-3">{String(n).padStart(2, "0")}</span>
        {href && link && (
          <Link href={href} className="group inline-flex items-center gap-2 rounded-ctl text-[14px] font-medium text-brand hover:text-brand-deep">
            {link}
            <ArrowRightIcon size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-baseline lg:gap-12">
        <h2 id={id} className="text-balance font-display text-[30px] font-medium leading-tight text-ink sm:text-[36px]">{title}</h2>
        {body && <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">{body}</p>}
      </div>
    </header>
  );
}

/** A dotted leader, as between an index entry and its page number. */
export function Leader({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("mb-[5px] min-w-6 flex-1 self-end border-b border-dotted border-ink-3/60", className)} />;
}
