import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  directoryUsers,
  findUserByUserId,
  resolveUserScope,
  type Assignment,
  type DirectoryUser,
} from '../data/directory';
import {
  authApi,
  TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_KEY,
  ACTIVE_ORG_KEY,
} from '../api/client';
import type { UserScope } from '../types';

const STORAGE_KEY = 'okobiz-erp-session';

const DEFAULT_SCOPE: UserScope = {
  allowedCompanyIds: [],
  allowedBranchIds: [],
  allowedDepartmentIds: [],
  financialApprovalLimit: 0,
};

interface StoredSession {
  userId: string;
  assignmentId: string;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  user?: DirectoryUser;
}

interface AuthContextValue {
  user: DirectoryUser | null;
  assignment: Assignment | null;
  /** Active ABAC scope for current assignment (allowed companies, branches, departments, approval limit) */
  scope: UserScope;
  isAuthenticated: boolean;
  /** Validates credentials with backend (by Employee ID) or local mock directory */
  login: (employeeId: string, password: string) => Promise<LoginResult>;
  /** Establishes the session for an already-validated user + chosen assignment. */
  establishSession: (userId: string, assignmentId: string) => void;
  /** Changes the active assignment for the signed-in user (workspace switch). */
  switchAssignment: (assignmentId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(readStoredSession);
  const [dynamicUser, setDynamicUser] = useState<DirectoryUser | null>(null);
  const [backendScope, setBackendScope] = useState<UserScope | null>(null);

  useEffect(() => {
    try {
      if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sessionStorage unavailable
    }
  }, [session]);

  const user = useMemo(() => {
    if (!session) return null;
    if (dynamicUser && (dynamicUser.userId === session.userId || dynamicUser.employeeId === session.userId)) {
      return dynamicUser;
    }
    const found = directoryUsers.find(
      (u) => u.userId === session.userId || u.employeeId === session.userId,
    );
    return found && found.status === 'active' ? found : null;
  }, [session, dynamicUser]);

  const assignment = useMemo(() => {
    if (!user || !session) return null;
    return (
      user.assignments.find((a) => a.id === session.assignmentId) ??
      user.assignments[0] ??
      null
    );
  }, [user, session]);

  const login = useCallback(
    async (employeeIdRaw: string, password: string): Promise<LoginResult> => {
      const cleanId = employeeIdRaw.trim();

      // 1. Try real NestJS Backend API first
      try {
        const res = await authApi.login({ employeeId: cleanId, password });

        localStorage.setItem(TOKEN_STORAGE_KEY, res.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
        if (res.activeAssignment?.organizationId) {
          localStorage.setItem(ACTIVE_ORG_KEY, res.activeAssignment.organizationId);
        }

        const mappedUser: DirectoryUser = {
          userId: res.user.employeeId || res.user.email,
          password: '',
          personName: res.user.name,
          initials: res.user.name
            .split(' ')
            .map((n) => n[0])
            .join(''),
          email: res.user.email,
          employeeId: res.user.employeeId,
          department: res.activeAssignment?.organizationName || 'Department',
          branch: res.activeAssignment?.companyId || 'HQ',
          status: 'active',
          assignments: res.availableAssignments.map((a) => ({
            id: a.id,
            roleKey: a.roleKey,
            companyId: a.companyId,
            orgLabel: a.organizationName,
            scopeMode: 'SUBTREE',
            title: a.title,
          })),
        };

        setDynamicUser(mappedUser);
        if (res.scope) {
          setBackendScope({
            allowedCompanyIds: res.scope.allowedCompanyIds || ['*'],
            allowedBranchIds: res.scope.allowedBranchIds || ['*'],
            allowedDepartmentIds: res.scope.allowedDepartmentIds || ['*'],
            financialApprovalLimit: res.scope.financialApprovalLimit || 0,
          });
        }

        return { ok: true, user: mappedUser };
      } catch (err: any) {
        // If the backend gave a structured error (e.g. invalid credentials, account locked)
        if (err?.error?.message) {
          return { ok: false, error: err.error.message };
        }

        // 2. Fallback to local mock directory if backend is offline or connecting
        const found = findUserByUserId(cleanId);
        if (!found || (found.password && found.password !== password)) {
          return { ok: false, error: 'Invalid Employee ID or password.' };
        }
        if (found.status === 'suspended') {
          return {
            ok: false,
            error: 'This account has been suspended by an administrator. Contact Group IT.',
          };
        }
        if (found.status === 'inactive') {
          return { ok: false, error: 'This account is inactive. Contact your HR administrator.' };
        }

        return { ok: true, user: found };
      }
    },
    [],
  );

  const establishSession = useCallback((userId: string, assignmentId: string) => {
    setSession({ userId, assignmentId });
  }, []);

  const switchAssignment = useCallback(
    async (assignmentId: string) => {
      if (!user) return;
      const targetAssignment = user.assignments.find((a) => a.id === assignmentId);

      // Attempt context switch on backend if token exists
      const targetOrg = targetAssignment?.companyId || targetAssignment?.orgLabel;
      if (targetOrg && localStorage.getItem(TOKEN_STORAGE_KEY)) {
        try {
          const res = await authApi.switchContext(targetOrg);
          if (res.accessToken) {
            localStorage.setItem(TOKEN_STORAGE_KEY, res.accessToken);
          }
          if (res.scope) {
            setBackendScope({
              allowedCompanyIds: res.scope.allowedCompanyIds || ['*'],
              allowedBranchIds: res.scope.allowedBranchIds || ['*'],
              allowedDepartmentIds: res.scope.allowedDepartmentIds || ['*'],
              financialApprovalLimit: res.scope.financialApprovalLimit || 0,
            });
          }
        } catch (err) {
          console.warn('Backend context switch fallback to client assignment switch:', err);
        }
      }

      setSession({ userId: user.userId, assignmentId });
    },
    [user],
  );

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    setSession(null);
    setDynamicUser(null);
    setBackendScope(null);
  }, []);

  const scope = useMemo<UserScope>(() => {
    if (backendScope) return backendScope;
    if (!assignment) return DEFAULT_SCOPE;
    return resolveUserScope(assignment, user);
  }, [backendScope, assignment, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      assignment,
      scope,
      isAuthenticated: Boolean(user && assignment),
      login,
      establishSession,
      switchAssignment,
      logout,
    }),
    [user, assignment, scope, login, establishSession, switchAssignment, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
