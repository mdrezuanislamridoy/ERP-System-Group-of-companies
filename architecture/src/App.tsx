import React, { useEffect, useRef, useState } from 'react';
import { LayersIcon, MenuIcon, XIcon } from 'lucide-react';
import { sections } from './data/doc';
import { Sidebar } from './components/Sidebar';
import { SectionView } from './components/SectionView';

interface AppProps {
  density?: 'comfortable' | 'compact';
}

export function App({ density = 'comfortable' }: AppProps) {
  const [activeId, setActiveId] = useState(sections[0].id);
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const index = sections.findIndex((s) => s.id === activeId);
  const section = sections[index] ?? sections[0];
  const compact = density === 'compact';

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeId]);

  function handleSelect(id: string) {
    setActiveId(id);
    setNavOpen(false);
  }

  return (
    <div className="flex h-screen w-full flex-col bg-canvas font-sans text-ink">
      <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
        <button
          type="button"
          onClick={() => setNavOpen((open) => !open)}
          aria-label={navOpen ? 'Close section list' : 'Open section list'}
          aria-expanded={navOpen}
          className="rounded border border-line p-1.5 text-muted transition-colors duration-150 hover:bg-rail hover:text-ink lg:hidden">
          
          {navOpen ? <XIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
        </button>

        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-ink">
            <LayersIcon className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-semibold leading-tight tracking-[-0.01em]">
              Group ERP Platform — Architecture Specification
            </h1>
            <p className="truncate font-mono text-2xs text-faint">
              Holding company · 20 to 50+ sister concerns · v1.0 · 20 Sep 2026
            </p>
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-1.5 md:flex">
          {['Modular monolith', 'Shared PostgreSQL', 'Scope-based authz'].map((chip) =>
          <span
            key={chip}
            className="rounded border border-line bg-rail px-2 py-1 font-mono text-2xs text-muted">
            
              {chip}
            </span>
          )}
          <span className="ml-1 rounded border border-line bg-rail px-2 py-1 font-mono text-2xs tabular-nums text-muted">
            {String(section.number).padStart(2, '0')} / {sections.length}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[272px] shrink-0 lg:block">
          <Sidebar activeId={activeId} onSelect={handleSelect} />
        </div>

        {navOpen ?
        <div className="fixed inset-0 top-14 z-20 flex lg:hidden">
            <div className="w-[272px] max-w-[80%] bg-rail shadow-xl">
              <Sidebar activeId={activeId} onSelect={handleSelect} />
            </div>
            <button
            type="button"
            aria-label="Close section list"
            onClick={() => setNavOpen(false)}
            className="flex-1 bg-ink/30">
            
              <XIcon className="ml-4 mt-4 h-5 w-5 text-white" />
            </button>
          </div> :
        null}

        <main
          ref={mainRef}
          className="doc-scroll min-w-0 flex-1 overflow-y-auto bg-canvas"
          tabIndex={-1}>
          
          <div className={compact ? 'mx-auto max-w-[1080px] px-5 py-7' : 'mx-auto max-w-[1080px] px-6 py-9'}>
            <SectionView
              section={section}
              previous={index > 0 ? sections[index - 1] : undefined}
              next={index < sections.length - 1 ? sections[index + 1] : undefined}
              compact={compact}
              onNavigate={handleSelect} />
            
          </div>
        </main>
      </div>
    </div>);

}