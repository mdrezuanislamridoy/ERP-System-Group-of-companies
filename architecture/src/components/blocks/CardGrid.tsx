import React from 'react';

interface CardGridProps {
  items: {title: string;body: string;meta?: string;}[];
}

export function CardGrid({ items }: CardGridProps) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
      {items.map((item) =>
      <li key={item.title} className="flex flex-col bg-surface px-4 py-3.5">
          <h4 className="text-[13.5px] font-semibold leading-snug text-ink">{item.title}</h4>
          {item.meta ?
        <span className="mt-1 font-mono text-2xs uppercase tracking-wider text-accent">
              {item.meta}
            </span> :
        null}
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{item.body}</p>
        </li>
      )}
    </ul>);

}