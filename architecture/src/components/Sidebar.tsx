import React, { useMemo, useRef, useState, useEffect } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { groups, sections } from '../data/doc';

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ activeId, onSelect }: SidebarProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (event.key === '/' && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape' && typing) {
        setQuery('');
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      sections.
      filter(
        (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        String(s.number) === q
      ).
      map((s) => s.id)
    );
  }, [query]);

  return (
    <nav
      aria-label="Document sections"
      className="flex h-full w-full flex-col border-r border-line bg-rail">
      
      <div className="border-b border-line p-3">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
            aria-hidden="true" />
          
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter sections"
            aria-label="Filter sections"
            className="w-full rounded border border-line bg-surface py-1.5 pl-8 pr-14 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30" />
          
          {query ?
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear filter"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint transition-colors duration-150 hover:text-ink">
            
              <XIcon className="h-3.5 w-3.5" />
            </button> :

          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line bg-rail px-1.5 py-0.5 font-mono text-2xs text-faint">
              /
            </kbd>
          }
        </div>
      </div>

      <div className="doc-scroll flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group) => {
          const visible = group.sectionIds.filter((id) => !matches || matches.has(id));
          if (!visible.length) return null;
          return (
            <div key={group.label} className="mb-4 last:mb-0">
              <p className="px-2 pb-1.5 font-mono text-2xs uppercase tracking-wider text-faint">
                {group.label}
              </p>
              <ul>
                {visible.map((id) => {
                  const section = sections.find((s) => s.id === id);
                  if (!section) return null;
                  const isActive = id === activeId;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => onSelect(id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={
                        'flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left transition-colors duration-150 ' + (
                        isActive ?
                        'bg-accent-soft text-accent' :
                        'text-muted hover:bg-line/60 hover:text-ink')
                        }>
                        
                        <span
                          className={
                          'w-5 shrink-0 font-mono text-2xs tabular-nums ' + (
                          isActive ? 'text-accent' : 'text-faint')
                          }>
                          
                          {String(section.number).padStart(2, '0')}
                        </span>
                        <span
                          className={
                          'text-[13px] leading-snug ' + (isActive ? 'font-semibold' : 'font-medium')
                          }>
                          
                          {section.title}
                        </span>
                      </button>
                    </li>);

                })}
              </ul>
            </div>);

        })}
        {matches && matches.size === 0 ?
        <p className="px-2 py-4 text-[13px] text-faint">No section matches that filter.</p> :
        null}
      </div>
    </nav>);

}