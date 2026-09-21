import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRightIcon,
  BuildingIcon,
  CornerDownLeftIcon,
  FileTextIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  UserIcon } from
'lucide-react';
import { cn } from '../../utils/cn';
import { useApp } from '../../contexts/AppContext';
import { employees } from '../../data/people';
import { invoices } from '../../data/finance';
import { purchaseRequests } from '../../data/operations';
import { companies } from '../../data/organization';

interface Entry {
  id: string;
  group: string;
  label: string;
  meta: string;
  to: string;
  permission?: string;
  company?: string;
  icon: React.ComponentType<{className?: string;}>;
}

export function CommandPalette({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const navigate = useNavigate();
  const { can, companyId } = useApp();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const entries = useMemo<Entry[]>(() => {
    const actions: Entry[] = [
    { id: 'a1', group: 'Actions', label: 'Create Purchase Request', meta: 'Procurement', to: '/procurement/requests', permission: 'pr.read', icon: PlusIcon },
    { id: 'a2', group: 'Actions', label: 'Create Invoice', meta: 'Finance', to: '/finance/invoices', permission: 'invoice.create', icon: PlusIcon },
    { id: 'a3', group: 'Actions', label: 'Open My Approvals', meta: 'Workflow', to: '/approvals', permission: 'pr.approve', icon: ArrowRightIcon },
    { id: 'a4', group: 'Actions', label: 'Open Audit Logs', meta: 'Administration', to: '/admin/audit', permission: 'audit.read', icon: ArrowRightIcon },
    { id: 'a5', group: 'Actions', label: 'Open My Workspace', meta: 'Self service', to: '/me', permission: 'self.read', icon: ArrowRightIcon }];

    const people: Entry[] = employees.slice(0, 8).map((e) => ({
      id: e.id,
      group: 'Employees',
      label: e.name,
      meta: `${e.position} · ${e.company}`,
      to: `/employees/${e.id}`,
      permission: 'employee.read',
      company: e.company,
      icon: UserIcon
    }));
    const inv: Entry[] = invoices.slice(0, 6).map((i) => ({
      id: i.id,
      group: 'Invoices',
      label: i.id,
      meta: `${i.party} · ${i.company}`,
      to: '/finance/invoices',
      permission: 'invoice.read',
      company: i.company,
      icon: ReceiptIcon
    }));
    const prs: Entry[] = purchaseRequests.slice(0, 5).map((p) => ({
      id: p.id,
      group: 'Purchase Requests',
      label: p.id,
      meta: `${p.title} · ${p.company}`,
      to: `/approvals/${p.id}`,
      permission: 'pr.read',
      company: p.company,
      icon: FileTextIcon
    }));
    const comps: Entry[] = companies.map((c) => ({
      id: c.id,
      group: 'Companies',
      label: c.name,
      meta: `${c.sector} · ${c.employees.toLocaleString('en-IN')} employees`,
      to: '/companies',
      // Only a group-scoped role should ever see another company's name surface in search.
      permission: 'group.read',
      icon: BuildingIcon
    }));
    return [...actions, ...people, ...prs, ...inv, ...comps];
  }, []);

  const authorizedScope = (e: Entry) => {
    if (e.permission && !can(e.permission)) return false;
    if (!can('group.read') && e.company && companyId) {
      const name = companies.find((c) => c.id === companyId)?.name;
      if (name && e.company !== name) return false;
    }
    return true;
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.
    filter(authorizedScope).
    filter((e) => !q || e.label.toLowerCase().includes(q) || e.meta.toLowerCase().includes(q)).
    slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, query, can, companyId]);

  useEffect(() => {
    setCursor(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      }
      if (e.key === 'Enter' && results[cursor]) {
        navigate(results[cursor].to);
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, results, cursor, navigate, onClose]);

  let lastGroup = '';

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]">
          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
          aria-hidden />
        
          <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -6 }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          role="dialog"
          aria-label="Global search and commands"
          className="relative w-full max-w-[600px] overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
          
            <div className="flex items-center gap-2 border-b border-line px-3">
              <SearchIcon className="h-4 w-4 text-faint" aria-hidden />
              <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees, invoices, orders, products..."
              aria-label="Search everything"
              className="h-11 flex-1 bg-transparent text-md text-ink placeholder:text-faint focus:outline-none" />
            
              <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-xs text-faint">ESC</kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-1.5">
              {results.length === 0 ?
            <p className="px-3 py-8 text-center text-base text-muted">
                  No results for “{query}”. Results are limited to records you are authorized to view.
                </p> :

            results.map((r, i) => {
              const showGroup = r.group !== lastGroup;
              lastGroup = r.group;
              const Icon = r.icon;
              return (
                <React.Fragment key={r.id}>
                      {showGroup &&
                  <p className="px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-[0.08em] text-faint">
                          {r.group}
                        </p>
                  }
                      <button
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => {
                      navigate(r.to);
                      onClose();
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition-colors duration-100 ease-out',
                      i === cursor ? 'bg-elevated' : 'hover:bg-elevated/60'
                    )}>
                    
                        <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base text-ink">{r.label}</span>
                          <span className="block truncate text-sm text-muted">{r.meta}</span>
                        </span>
                        {i === cursor && <CornerDownLeftIcon className="h-3.5 w-3.5 text-faint" aria-hidden />}
                      </button>
                    </React.Fragment>);

            })
            }
            </div>

            <div className="flex items-center gap-4 border-t border-line px-3 py-1.5 text-xs text-faint">
              <span>↑↓ navigate</span>
              <span>⏎ open</span>
              <span className="ml-auto">Results respect your permissions</span>
            </div>
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}