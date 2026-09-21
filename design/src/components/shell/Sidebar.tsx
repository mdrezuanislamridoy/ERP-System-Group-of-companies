import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDownIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, StarIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useApp } from '../../contexts/AppContext';
import { employeeNavigation, navigation, recentContexts, type NavItem } from '../../data/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { can, roleKey } = useApp();
  const location = useLocation();
  const [open, setOpen] = useState<string[]>(['Accounting']);

  const sections = roleKey === 'employee' ? employeeNavigation : navigation;
  const visible = sections.
  map((s) => ({ ...s, items: s.items.filter((i) => !i.permission || can(i.permission)) })).
  filter((s) => s.items.length > 0);

  const isActive = (to?: string) =>
  to ? to === '/' ? location.pathname === '/' : location.pathname.startsWith(to.split('?')[0]) : false;

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    if (item.children) {
      const expanded = open.includes(item.label);
      const childActive = item.children.some((c) => isActive(c.to));
      return (
        <li key={item.label}>
          <button
            onClick={() =>
            setOpen((prev) => prev.includes(item.label) ? prev.filter((l) => l !== item.label) : [...prev, item.label])
            }
            aria-expanded={expanded}
            title={collapsed ? item.label : undefined}
            className={cn(
              'flex w-full items-center gap-2 rounded px-2 py-1.5 text-base transition-colors duration-100 ease-out',
              childActive ? 'text-ink' : 'text-muted hover:bg-surface hover:text-ink'
            )}>
            
            {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
            {!collapsed &&
            <>
                <span className="truncate">{item.label}</span>
                <ChevronDownIcon
                className={cn('ml-auto h-3 w-3 transition-transform duration-150 ease-out', expanded && 'rotate-180')}
                aria-hidden />
              
              </>
            }
          </button>
          {!collapsed && expanded &&
          <ul className="ml-[18px] mt-0.5 space-y-0.5 border-l border-line pl-2">
              {item.children.map((child) =>
            <li key={child.label}>
                  <NavLink
                to={child.to ?? '#'}
                end
                className={({ isActive: active }) =>
                cn(
                  'block rounded px-2 py-1 text-base transition-colors duration-100 ease-out',
                  active ? 'bg-surface text-ink' : 'text-muted hover:bg-surface hover:text-ink'
                )
                }>
                
                    {child.label}
                  </NavLink>
                </li>
            )}
            </ul>
          }
        </li>);

    }

    return (
      <li key={item.label}>
        <NavLink
          to={item.to ?? '#'}
          end={item.to === '/'}
          title={collapsed ? item.label : undefined}
          className={({ isActive: active }) =>
          cn(
            'group flex items-center gap-2 rounded px-2 py-1.5 text-base transition-colors duration-100 ease-out',
            active ?
            'bg-surface font-medium text-ink shadow-[inset_2px_0_0_0_#3B82F6]' :
            'text-muted hover:bg-surface hover:text-ink'
          )
          }>
          
          {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && item.badge ?
          <span className="ml-auto rounded border border-line bg-canvas px-1 font-mono text-xs text-muted">
              {item.badge}
            </span> :
          null}
        </NavLink>
      </li>);

  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-line bg-subtle transition-[width] duration-150 ease-out',
        collapsed ? 'w-[52px]' : 'w-[228px]'
      )}>
      
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {visible.map((section) =>
        <div key={section.label} className="mb-4 last:mb-0">
            {!collapsed &&
          <p className="px-2 pb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                {section.label}
              </p>
          }
            <ul className="space-y-0.5">{section.items.map(renderItem)}</ul>
          </div>
        )}

        {/* Recent cross-context shortcuts only make sense for a role that can actually cross company lines. */}
        {!collapsed && can('group.read') &&
        <div className="mt-2 border-t border-line pt-3">
            <p className="flex items-center gap-1.5 px-2 pb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
              <StarIcon className="h-3 w-3" aria-hidden /> Recent
            </p>
            <ul className="space-y-0.5">
              {recentContexts.map((r) =>
            <li key={r.label}>
                  <NavLink
                to={r.to}
                className="block truncate rounded px-2 py-1 text-sm text-muted transition-colors duration-100 ease-out hover:bg-surface hover:text-ink">
                
                    {r.label}
                  </NavLink>
                </li>
            )}
            </ul>
          </div>
        }
      </div>

      <button
        onClick={onToggle}
        className="flex items-center gap-2 border-t border-line px-3 py-2 text-sm text-muted transition-colors duration-100 ease-out hover:text-ink"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        
        {collapsed ?
        <PanelLeftOpenIcon className="h-4 w-4" aria-hidden /> :

        <>
            <PanelLeftCloseIcon className="h-4 w-4" aria-hidden />
            Collapse
          </>
        }
      </button>
    </nav>);

}