import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { RoleKey } from '../types';
import type { Assignment } from '../data/directory';
import { roleTemplates } from '../data/roles';
import { companies, group } from '../data/organization';
import { useAuth } from './AuthContext';

interface RoleProfile {
  key: string;
  level: RoleKey;
  label: string;
  user: string;
  initials: string;
  title: string;
  scopeLabel: string;
  permissions: string[];
  home: string;
}

const HOME_BY_LEVEL: Record<RoleKey, string> = {
  'group-exec': '/',
  'company-exec': '/company',
  'department-head': '/department',
  employee: '/me'
};

const EMPTY_ROLE: RoleProfile = {
  key: 'none',
  level: 'employee',
  label: 'No role assigned',
  user: '',
  initials: '—',
  title: '',
  scopeLabel: '',
  permissions: [],
  home: '/me'
};

interface AppContextValue {
  role: RoleProfile;
  roleKey: RoleKey;
  can: (permission: string) => boolean;
  companyId: string | null;
  companyName: string;
  setCompanyId: (id: string | null) => void;
  assignments: Assignment[];
  activeAssignmentId: string | null;
  switchAssignment: (assignmentId: string) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  density: 'comfortable' | 'compact';
}

const AppContext = createContext<AppContextValue | null>(null);

interface ProviderProps {
  children: React.ReactNode;
  density: 'comfortable' | 'compact';
}

export function AppProvider({ children, density }: ProviderProps) {
  const { user, assignment, switchAssignment: authSwitchAssignment } = useAuth();
  const [companyId, setCompanyIdState] = useState<string | null>(assignment?.companyId ?? null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Re-lens to the newly active assignment's own scope whenever the workspace changes.
  useEffect(() => {
    setCompanyIdState(assignment?.companyId ?? null);
  }, [assignment?.id]);

  const template = assignment ? roleTemplates[assignment.roleKey] : null;

  const role = useMemo<RoleProfile>(() => {
    if (!user || !assignment || !template) return EMPTY_ROLE;
    const scopeLabel = assignment.companyId ?
    companies.find((c) => c.id === assignment.companyId)?.name ?? assignment.orgLabel :
    `${group.name} · ${group.companies} companies`;
    return {
      key: template.key,
      level: template.level,
      label: template.label,
      user: user.personName,
      initials: user.initials,
      title: assignment.title ?? template.label,
      scopeLabel,
      permissions: template.permissions,
      home: HOME_BY_LEVEL[template.level]
    };
  }, [user, assignment, template]);

  const can = useCallback((permission: string) => role.permissions.includes(permission), [role]);

  // Only a group-scoped role may "browse" an arbitrary company lens; anyone else stays pinned to their own scope.
  const setCompanyId = useCallback(
    (id: string | null) => {
      if (id === null || can('group.read')) {
        setCompanyIdState(id);
      } else {
        setCompanyIdState(assignment?.companyId ?? null);
      }
    },
    [can, assignment]
  );

  const companyName = useMemo(() => {
    if (!companyId) return group.name;
    return companies.find((c) => c.id === companyId)?.name ?? group.name;
  }, [companyId]);

  const value = useMemo<AppContextValue>(
    () => ({
      role,
      roleKey: role.level,
      can,
      companyId,
      companyName,
      setCompanyId,
      assignments: user?.assignments ?? [],
      activeAssignmentId: assignment?.id ?? null,
      switchAssignment: authSwitchAssignment,
      paletteOpen,
      setPaletteOpen,
      notificationsOpen,
      setNotificationsOpen,
      density
    }),
    [
    role,
    can,
    companyId,
    companyName,
    setCompanyId,
    user,
    assignment,
    authSwitchAssignment,
    paletteOpen,
    notificationsOpen,
    density]

  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
