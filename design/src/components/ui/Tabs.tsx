import React from 'react';
import { cn } from '../../utils/cn';

interface TabsProps {
  tabs: Array<{id: string;label: string;count?: number;}>;
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto border-b border-line', className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-base font-medium transition-colors duration-100 ease-out',
              isActive ?
              'border-accent text-ink' :
              'border-transparent text-muted hover:text-ink'
            )}>
            
            {tab.label}
            {typeof tab.count === 'number' &&
            <span className="ml-1.5 rounded border border-line bg-surface px-1 font-mono text-xs text-muted">
                {tab.count}
              </span>
            }
          </button>);

      })}
    </div>);

}