import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { RoleKey, UserScope, ModuleKey } from '../types';
import type { Assignment } from '../data/directory';
import { roleTemplates } from '../data/roles';
import { group } from '../data/organization';
import { useAuth } from './AuthContext';
import { useEntityScope } from './EntityScopeContext';

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
  branchId: string | null;
  branchName: string;
  setBranchId: (id: string | null) => void;
  scope: UserScope;
  assignments: Assignment[];
  activeAssignmentId: string | null;
  switchAssignment: (assignmentId: string) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  density: 'comfortable' | 'compact';
  isModuleEnabled: (moduleKey?: ModuleKey, companyId?: string | null) => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

interface ProviderProps {
  children: React.ReactNode;
  density: 'comfortable' | 'compact';
}

export function AppProvider({ children, density }: ProviderProps) {
  const { user, assignment, switchAssignment: authSwitchAssignment } = useAuth();
  const {
    activeCompanyId,
    activeCompanyName,
    setActiveCompanyId,
    activeBranchId,
    activeBranchName,
    setActiveBranchId,
    scope,
    isModuleEnabled
  } = useEntityScope();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const template = assignment ? roleTemplates[assignment.roleKey] : null;

  const role = useMemo<RoleProfile>(() => {
    if (!user || !assignment || !template) return EMPTY_ROLE;
    const scopeLabel = activeCompanyId ? activeCompanyName : `${group.name} · ${group.companies} companies`;
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
  }, [user, assignment, template, activeCompanyId, activeCompanyName]);

  const can = useCallback((permission: string) => role.permissions.includes(permission), [role]);

  const value = useMemo<AppContextValue>(
    () => ({
      role,
      roleKey: role.level,
      can,
      companyId: activeCompanyId,
      companyName: activeCompanyName,
      setCompanyId: setActiveCompanyId,
      branchId: activeBranchId,
      branchName: activeBranchName,
      setBranchId: setActiveBranchId,
      scope,
      assignments: user?.assignments ?? [],
      activeAssignmentId: assignment?.id ?? null,
      switchAssignment: authSwitchAssignment,
      paletteOpen,
      setPaletteOpen,
      notificationsOpen,
      setNotificationsOpen,
      density,
      isModuleEnabled
    }),
    [
      role,
      can,
      activeCompanyId,
      activeCompanyName,
      setActiveCompanyId,
      activeBranchId,
      activeBranchName,
      setActiveBranchId,
      scope,
      user,
      assignment,
      authSwitchAssignment,
      paletteOpen,
      notificationsOpen,
      density,
      isModuleEnabled
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
