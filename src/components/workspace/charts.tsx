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
  const W = 600;
  const H = 140;
  const gap = 6;
  const bw = (W - gap * (values.length - 1)) / values.length;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label={title} className="h-auto w-full">
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--line)" strokeWidth="1" />
        {values.map((v, i) => {
          const h = Math.max(v ? 4 : 0, (v / max) * (H - 22));
          const x = i * (bw + gap);
          const last = i === values.length - 1;
          return (
            <g key={labels[i]}>
              <title>{`${labels[i]}: ${unit(v)}`}</title>
              {/* A tall invisible target, so the hover answers above a short bar too. */}
              <rect x={x} y={0} width={bw} height={H} fill="transparent" />
              {h > 0 && <path d={`M${x},${H} V${H - h + 4} Q${x},${H - h} ${x + 4},${H - h} H${x + bw - 4} Q${x + bw},${H - h} ${x + bw},${H - h + 4} V${H} Z`} fill="var(--brand)" opacity={last ? 1 : 0.55} />}
              {last && (
                <text x={x + bw / 2} y={H - h - 6} textAnchor="middle" className="fill-[var(--ink)] text-[13px] font-semibold">
                  {v}
                </text>
              )}
            </g>
          );
        })}
        <text x="0" y={H + 16} className="fill-[var(--ink-3)] text-[11px]">{labels[0]}</text>
        <text x={W} y={H + 16} textAnchor="end" className="fill-[var(--ink-3)] text-[11px]">{labels.at(-1)}</text>
      </svg>
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
