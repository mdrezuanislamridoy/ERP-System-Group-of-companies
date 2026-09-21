import React from 'react';
import { KeyIcon, TableIcon } from 'lucide-react';
import type { ErdEntity } from '../../types/doc';

interface ErdClusterProps {
  cluster: string;
  entities: ErdEntity[];
}

export function ErdCluster({ cluster, entities }: ErdClusterProps) {
  return (
    <section className="rounded-md border border-line bg-rail p-3">
      <h4 className="mb-2.5 flex items-center gap-2 px-1 font-mono text-2xs uppercase tracking-wider text-muted">
        <TableIcon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        {cluster}
      </h4>
      <ul className="grid gap-2.5 lg:grid-cols-2">
        {entities.map((entity) =>
        <li key={entity.name} className="overflow-hidden rounded border border-line bg-surface">
            <header className="border-b border-line px-3 py-2">
              <p className="font-mono text-[12.5px] font-medium text-ink">{entity.name}</p>
              <p className="mt-0.5 text-2xs leading-snug text-muted">{entity.purpose}</p>
            </header>
            <div className="flex items-center gap-1.5 border-b border-line bg-accent-soft px-3 py-1.5">
              <KeyIcon className="h-3 w-3 text-accent" aria-hidden="true" />
              <span className="font-mono text-2xs text-accent">PK {entity.pk}</span>
            </div>
            <ul className="divide-y divide-line/70">
              {entity.columns.map((col) =>
            <li key={col.name} className="flex flex-wrap items-baseline gap-x-2 px-3 py-1">
                  <span className="font-mono text-2xs font-medium text-ink">{col.name}</span>
                  <span className="font-mono text-2xs text-muted">{col.type}</span>
                  {col.note ? <span className="text-2xs text-faint">— {col.note}</span> : null}
                </li>
            )}
            </ul>
            {entity.indexes && entity.indexes.length ?
          <footer className="border-t border-line bg-rail px-3 py-1.5">
                <span className="font-mono text-2xs uppercase tracking-wider text-faint">idx </span>
                <span className="font-mono text-2xs text-muted">{entity.indexes.join('  ·  ')}</span>
              </footer> :
          null}
          </li>
        )}
      </ul>
    </section>);

}