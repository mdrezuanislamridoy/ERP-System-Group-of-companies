import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { NotificationDrawer } from './NotificationDrawer';

export function AppShell() {
  const { paletteOpen, setPaletteOpen, notificationsOpen, setNotificationsOpen } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  return (
    <div className="flex h-full w-full flex-col bg-canvas text-ink">
      <TopBar onMenu={() => setMobileNav(true)} />

      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:flex">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <AnimatePresence>
        {mobileNav &&
        <>
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileNav(false)}
            aria-hidden />
          
            <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="fixed left-0 top-0 z-50 h-full lg:hidden"
            role="dialog"
            aria-label="Navigation">
            
              <div className="relative h-full" onClick={() => setMobileNav(false)}>
                <Sidebar collapsed={false} onToggle={() => setMobileNav(false)} />
                <button
                onClick={() => setMobileNav(false)}
                aria-label="Close navigation"
                className="absolute -right-9 top-2 rounded border border-line bg-surface p-1.5 text-muted">
                
                  <XIcon className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </motion.div>
          </>
        }
      </AnimatePresence>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <NotificationDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>);

}