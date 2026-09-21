import React from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import type { DocSection } from '../types/doc';
import { BlockRenderer } from './blocks/BlockRenderer';

interface SectionViewProps {
  section: DocSection;
  previous?: DocSection;
  next?: DocSection;
  compact: boolean;
  onNavigate: (id: string) => void;
}

export function SectionView({ section, previous, next, compact, onNavigate }: SectionViewProps) {
  return (
    <article className={compact ? 'pb-16' : 'pb-20'}>
      <header className="mb-6 border-b border-line pb-5">
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-accent">
          Section {String(section.number).padStart(2, '0')}
        </p>
        <h2 className="mt-1.5 text-[26px] font-bold leading-tight tracking-[-0.015em] text-ink">
          {section.title}
        </h2>
        <p className="mt-2 max-w-prose text-[14.5px] leading-relaxed text-muted">{section.summary}</p>
      </header>

      <div className={compact ? 'space-y-4' : 'space-y-6'}>
        {section.blocks.map((block, i) =>
        <BlockRenderer key={i} block={block} />
        )}
      </div>

      <nav
        aria-label="Section navigation"
        className="mt-10 grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
        
        {previous ?
        <button
          type="button"
          onClick={() => onNavigate(previous.id)}
          className="group flex items-center gap-2.5 rounded-md border border-line bg-surface px-3.5 py-3 text-left transition-colors duration-150 hover:border-line-strong hover:bg-rail">
          
            <ArrowLeftIcon className="h-4 w-4 shrink-0 text-faint transition-colors duration-150 group-hover:text-accent" />
            <span className="min-w-0">
              <span className="block font-mono text-2xs uppercase tracking-wider text-faint">
                Previous
              </span>
              <span className="block truncate text-[13.5px] font-medium text-ink">
                {previous.title}
              </span>
            </span>
          </button> :

        <span />
        }
        {next ?
        <button
          type="button"
          onClick={() => onNavigate(next.id)}
          className="group flex items-center justify-end gap-2.5 rounded-md border border-line bg-surface px-3.5 py-3 text-right transition-colors duration-150 hover:border-line-strong hover:bg-rail">
          
            <span className="min-w-0">
              <span className="block font-mono text-2xs uppercase tracking-wider text-faint">Next</span>
              <span className="block truncate text-[13.5px] font-medium text-ink">{next.title}</span>
            </span>
            <ArrowRightIcon className="h-4 w-4 shrink-0 text-faint transition-colors duration-150 group-hover:text-accent" />
          </button> :
        null}
      </nav>
    </article>);

}