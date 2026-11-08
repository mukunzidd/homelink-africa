/**
 * The overview's two charts, drawn on the server as plain SVG and HTML.
 *
 * Both are one series, so one hue (the brand), no legend, and the title
 * names what is drawn. Values sit on the marks that matter (the latest
 * week; every bar, since the bars are the point), each mark answers on
 * hover through a title, and each chart carries a table for anyone not
 * reading the picture.
 */
export function WeeklyBars({ values, labels, title, unit }: { values: number[]; labels: string[]; title: string; unit: (n: number) => string }) {
  const max = Math.max(1, ...values);
  // Drawn in HTML rather than a stretched SVG, so text stays the size it
  // was set at whatever width the card is.
  return (
    <figure className="flex flex-col gap-2">
      {/* Headroom above the tallest bar for the latest value's label; every bar is in proportion. */}
      <div role="img" aria-label={title} className="flex h-44 items-end gap-1.5 border-b border-line pt-6">
        {values.map((v, i) => {
          const last = i === values.length - 1;
          return (
            <div key={labels[i]} title={`${labels[i]}: ${unit(v)}`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <span
                className={last ? "relative w-full rounded-t-[4px] bg-brand" : "w-full rounded-t-[4px] bg-brand/55"}
                style={{ height: v ? `max(4px, ${(v / max) * 100}%)` : 0 }}
              >
                {last && <span className="tnum absolute -top-5 left-1/2 -translate-x-1/2 text-[13px] font-semibold text-ink">{v}</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11.5px] text-ink-3">
        <span>{labels[0]}</span>
        <span>{labels.at(-1)}</span>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {values.map((v, i) => (
            <tr key={labels[i]}><th scope="row">{labels[i]}</th><td>{unit(v)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function ShareBars({ rows, title }: { rows: { id: string; label: string; share: number; text: string; href?: string }[]; title: string }) {
  return (
    <figure className="flex flex-col gap-2.5" aria-label={title}>
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)_44px] items-center gap-3 text-[13px] sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_48px]" title={`${r.label}: ${r.text}`}>
          <span className="truncate text-ink-2">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round(r.share * 100)}%` }} />
          </span>
          <span className="tnum text-right font-semibold text-ink">{r.text}</span>
        </div>
      ))}
    </figure>
  );
}
