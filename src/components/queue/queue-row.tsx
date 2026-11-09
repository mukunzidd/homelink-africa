import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * A queue row that opens in place.
 *
 * `details`/`summary` rather than a button with `aria-expanded`: the queue is a
 * server component, and the native disclosure gives keyboard, screen-reader
 * and no-JavaScript behaviour for free. A client island per row would buy
 * nothing the browser does not already do.
 *
 * Opening in place rather than navigating to a record page, because ops reads
 * a queue by scanning down it. A separate page per row would make every check
 * a round trip and lose the place in the list.
 *
 * The summary holds only phrasing-level markup (spans styled as blocks): a
 * `<summary>` is announced as a button, and block elements and lists inside
 * one are invalid and read badly.
 */
export function QueueRow({
  summary,
  children,
  muted = false,
  open,
  id,
}: {
  /** Opened on arrival: a link straight to one record. */
  open?: boolean;
  id?: string;
  summary: React.ReactNode;
  /** The read-only record shown when the row is open. */
  children: React.ReactNode;
  /** Finished work, dimmed so the eye skips it. */
  muted?: boolean;
}) {
  return (
    <li id={id} className="scroll-mt-24 border-t border-line">
      <details className="group" open={open}>
        <summary
          className={cn(
            "flex cursor-pointer list-none items-start gap-3 py-4 transition-colors duration-150",
            "hover:bg-surface-2/60 [&::-webkit-details-marker]:hidden",
            muted && "opacity-60 group-open:opacity-100",
          )}
        >
          <span className="min-w-0 flex-1">{summary}</span>
          <span
            aria-hidden="true"
            className="mt-1 grid size-6 flex-none place-items-center rounded-inner text-ink-3 transition-transform duration-150 group-open:rotate-180"
          >
            <ChevronDownIcon size={14} />
          </span>
        </summary>

        <div className="mb-4 flex flex-col gap-5 rounded-card border border-line bg-surface-2/50 p-4 sm:p-5">
          {children}
        </div>
      </details>
    </li>
  );
}

/** One labelled fact in an open record. */
export function RecordFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[12px] font-medium text-ink-3">{label}</dt>
      <dd className="text-[14px] leading-relaxed text-ink">{children}</dd>
    </div>
  );
}

export function RecordFacts({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
  );
}

/**
 * An action ops will eventually take here, shown switched off with the reason
 * beside it. Leaving the button out would hide where it goes and how much room
 * it takes; leaving it live would be a control next to real money that does
 * nothing. The reason is visible text, not only a tooltip, because a tooltip
 * does not exist on a phone.
 */
export function DisabledAction({
  label,
  reason,
}: {
  label: string;
  reason: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-4">
      <button
        type="button"
        disabled
        title={reason}
        className="min-h-9 cursor-not-allowed rounded-ctl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-3"
      >
        {label}
      </button>
      <p className="text-[12.5px] text-ink-3">{reason}</p>
    </div>
  );
}
