"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Segmented } from "@/components/ui/segmented";
import { ArrowRightIcon } from "@/components/ui/icons";

const SIZES = { desktop: { w: 1440, h: 900 }, phone: { w: 390, h: 844 } } as const;
type Size = keyof typeof SIZES;

/**
 * Live frames of each candidate page at a real device size, scaled down to
 * fit the column, so each is judged as it renders (fonts, photo crop, the
 * search's own layout) and not from a screenshot. Desktop frames sit two to
 * a row, phone frames four.
 */
export function HeroCompare({
  locale,
  current,
  groups,
  labels,
}: {
  locale: string;
  current: string;
  groups: { title: string; options: { key: string; name: string; body: string }[] }[];
  labels: { desktop: string; phone: string; open: string; current: string };
}) {
  const [size, setSize] = useState<Size>("desktop");
  return (
    <div className="flex flex-col gap-6">
      <Segmented<Size>
        label={labels.desktop}
        value={size}
        onChange={setSize}
        options={[
          { value: "desktop", label: labels.desktop },
          { value: "phone", label: labels.phone },
        ]}
        className="self-start"
      />
      {groups.map((g) => (
        <section key={g.title} className="flex flex-col gap-4">
          <h2 className="text-[18px] font-medium text-ink">{g.title}</h2>
          <ul className={size === "desktop" ? "grid gap-8 lg:grid-cols-2" : "grid gap-6 sm:grid-cols-2 xl:grid-cols-4"}>
            {g.options.map((o) => (
              <li key={o.key} className="flex flex-col gap-3">
                <Frame src={`/${locale}/preview/landing/${o.key}`} title={o.name} size={size} />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="flex items-center gap-2 text-[16px] font-medium text-ink">
                      {o.name}
                      {o.key === current && <span className="text-[12px] font-normal text-trust">{labels.current}</span>}
                    </p>
                    <p className="text-[13px] leading-relaxed text-ink-3">{o.body}</p>
                  </div>
                  <Link href={`/preview/landing/${o.key}`} target="_blank" className="flex flex-none items-center gap-1 text-[13px] font-medium text-brand hover:text-brand-deep">
                    {labels.open}
                    <ArrowRightIcon size={14} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Frame({ src, title, size }: { src: string; title: string; size: Size }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const { w, h } = SIZES[size];
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-[12px] border border-line bg-surface" style={{ aspectRatio: `${w} / ${h}` }}>
      {scale > 0 && (
        <iframe
          key={size}
          src={src}
          title={title}
          loading="lazy"
          width={w}
          height={h}
          className="absolute left-0 top-0 origin-top-left border-0"
          style={{ transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}
