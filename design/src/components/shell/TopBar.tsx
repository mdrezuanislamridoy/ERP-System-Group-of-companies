import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BellIcon,
  BuildingIcon,
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  ShieldIcon,
  UserIcon } from
'lucide-react';
import { cn } from '../../utils/cn';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { ContextSwitcher } from './ContextSwitcher';
import { notifications } from '../../data/system';
import { roleTemplates } from '../../data/roles';

export function TopBar({ onMenu }: {onMenu: () => void;}) {
  const { role, setPaletteOpen, setNotificationsOpen, assignments, activeAssignmentId, switchAssignment } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => n.unread).length;

  function handleSwitchAssignment(id: string) {
    switchAssignment(id);
    setMenuOpen(false);
    navigate('/');
  }

  function handleSignOut() {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-subtle px-3">
      <button
        onClick={onMenu}
        className="rounded p-1.5 text-muted transition-colors duration-100 ease-out hover:bg-surface hover:text-ink lg:hidden"
        aria-label="Open navigation">
        
        <MenuIcon className="h-4 w-4" aria-hidden />
      </button>

      <Link to="/" className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded border border-line bg-surface font-mono text-sm font-semibold text-ink">
          A
        </span>
        <span className="hidden text-md font-semibold tracking-tight text-ink sm:block">ABC Group OS</span>
      </Link>

      <div className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />

      <ContextSwitcher />

      <button
        onClick={() => setPaletteOpen(true)}
        className="ml-auto flex h-7 w-full max-w-[420px] items-center gap-2 rounded border border-line bg-canvas px-2 text-left text-base text-faint transition-colors duration-100 ease-out hover:border-line-strong"
        aria-label="Open global search">
        
        <SearchIcon className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden truncate md:block">Search employees, invoices, orders, products...</span>
        <span className="md:hidden">Search</span>
        <kbd className="ml-auto hidden rounded border border-line px-1 font-mono text-xs text-faint md:block">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <button
          onClick={() => setNotificationsOpen(true)}
          className="relative rounded p-1.5 text-muted transition-colors duration-100 ease-out hover:bg-surface hover:text-ink"
          aria-label={`Notifications, ${unread} unread`}>
          
          <BellIcon className="h-4 w-4" aria-hidden />
          {unread > 0 &&
          <span className="absolute right-1 top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-danger px-0.5 font-mono text-2xs font-medium text-white">
              {unread}
            </span>
          }
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={cn(
              'flex h-7 items-center gap-2 rounded border border-transparent px-1.5 transition-colors duration-100 ease-out hover:bg-surface',
              menuOpen && 'border-line bg-surface'
            )}>
            
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface font-mono text-xs font-medium text-muted">
              {role.initials}
            </span>
            <span className="hidden text-base text-ink lg:block">{role.user}</span>
            <ChevronDownIcon className="h-3 w-3 text-faint" aria-hidden />
          </button>

          {menuOpen &&
          <div
            role="menu"
            className="absolute right-0 top-9 z-50 w-[250px] rounded-lg border border-line bg-surface shadow-pop">
            
              <div className="border-b border-line px-3 py-2.5">
                <p className="text-base font-semibold text-ink">{role.user}</p>
                <p className="text-sm text-muted">{role.title}</p>
                <p className="mt-1.5 text-xs text-faint">Scope: {role.scopeLabel}</p>
              </div>

              {assignments.length > 1 &&
              <div className="max-h-[280px] overflow-y-auto border-b border-line p-1.5">
                  <p className="px-2 pb-1 pt-1 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                    Your workspaces
                  </p>
                  {assignments.map((a) => {
                  const template = roleTemplates[a.roleKey];
                  const active = a.id === activeAssignmentId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleSwitchAssignment(a.id)}
                      disabled={active}
                      role="menuitem"
                      className={cn(
                        'flex w-full items-start gap-2 rounded px-2 py-1.5 text-left transition-colors duration-100 ease-out',
                        active ? 'bg-accent-soft' : 'hover:bg-elevated'
                      )}>

                        <BuildingIcon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', active ? 'text-accent' : 'text-muted')} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate text-base', active ? 'font-medium text-accent' : 'text-ink')}>
                            {a.title ?? template.label}
                          </span>
                          <span className="block truncate text-xs text-faint">{a.orgLabel}</span>
                        </span>
                      </button>);

                })}
                </div>
              }

              <div className="p-1.5">
                <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-base text-ink transition-colors duration-100 ease-out hover:bg-elevated"
                role="menuitem">

                  <UserIcon className="h-3.5 w-3.5 text-muted" aria-hidden /> Profile & preferences
                </Link>
                <Link
                to="/profile?tab=security"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-base text-ink transition-colors duration-100 ease-out hover:bg-elevated"
                role="menuitem">

                  <ShieldIcon className="h-3.5 w-3.5 text-muted" aria-hidden /> Security & sessions
                </Link>
                <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-base text-muted transition-colors duration-100 ease-out hover:bg-elevated hover:text-ink"
                role="menuitem">

                  <LogOutIcon className="h-3.5 w-3.5" aria-hidden /> Sign out
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </header>);

}