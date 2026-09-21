import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon, SettingsIcon, XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { StateBlock } from '../ui/States';
import { notifications as seed } from '../../data/system';

const CATEGORIES = ['All', 'Approvals', 'HR', 'Finance', 'Operations', 'System', 'Security'] as const;

const TONE_ICON = {
  info: InfoIcon,
  success: CheckCircle2Icon,
  warning: AlertTriangleIcon,
  danger: AlertTriangleIcon
};

const TONE_COLOR = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger'
};

export function NotificationDrawer({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const [items, setItems] = useState(seed);
  const [tab, setTab] = useState<(typeof CATEGORIES)[number]>('All');

  const filtered = tab === 'All' ? items : items.filter((n) => n.category === tab);

  return (
    <AnimatePresence>
      {open &&
      <>
          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
          aria-hidden />
        
          <motion.aside
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 24, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          role="dialog"
          aria-label="Notifications"
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col border-l border-line bg-subtle">
          
            <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <div>
                <h2 className="text-md font-semibold text-ink">Notifications</h2>
                <p className="text-sm text-muted">{items.filter((i) => i.unread).length} unread</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="xs" icon={SettingsIcon} aria-label="Notification preferences" />
                <Button variant="ghost" size="xs" icon={XIcon} onClick={onClose} aria-label="Close notifications" />
              </div>
            </header>

            <div className="flex gap-1 overflow-x-auto border-b border-line px-2 py-1.5">
              {CATEGORIES.map((c) =>
            <button
              key={c}
              onClick={() => setTab(c)}
              className={cn(
                'whitespace-nowrap rounded px-2 py-1 text-sm transition-colors duration-100 ease-out',
                tab === c ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
              )}>
              
                  {c}
                </button>
            )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ?
            <StateBlock
              title="Nothing here"
              description={`You have no ${tab.toLowerCase()} notifications right now.`} /> :


            <ul className="divide-y divide-line">
                  {filtered.map((n) => {
                const Icon = TONE_ICON[n.tone];
                return (
                  <li key={n.id}>
                        <button
                      onClick={() =>
                      setItems((prev) => prev.map((i) => i.id === n.id ? { ...i, unread: false } : i))
                      }
                      className="flex w-full gap-3 px-4 py-3 text-left transition-colors duration-100 ease-out hover:bg-surface">
                      
                          <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONE_COLOR[n.tone])} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-2">
                              <span className={cn('text-base', n.unread ? 'font-medium text-ink' : 'text-muted')}>
                                {n.title}
                              </span>
                              {n.unread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                            </span>
                            <span className="mt-0.5 block truncate text-sm text-muted">{n.meta}</span>
                            <span className="mt-1 block text-xs text-faint">
                              {n.category} · {n.time}
                            </span>
                          </span>
                        </button>
                      </li>);

              })}
                </ul>
            }
            </div>

            <footer className="border-t border-line px-4 py-2">
              <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setItems((prev) => prev.map((i) => ({ ...i, unread: false })))}>
              
                Mark all as read
              </Button>
            </footer>
          </motion.aside>
        </>
      }
    </AnimatePresence>);

}