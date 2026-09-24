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
  /** Validates credentials against the local mock directory (frontend-only for now); falls back to backend if wired up later */
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

      // ── Local demo directory auth (works without backend) ──────────
      // Since the backend is not yet connected, authenticate directly
      // against the local mock directory. This allows all test/demo
      // accounts to work instantly.
      const found = findUserByUserId(cleanId);
      if (found) {
        if (found.password && found.password !== password) {
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

      // ── Backend API auth (when backend is connected) ───────────────
      // If user is not in the local directory, attempt backend login.
      // This path will be the primary path once the backend is live.
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
      } catch {
        return { ok: false, error: 'Invalid Employee ID or password.' };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    setSession(null);
    setDynamicUser(null);
    setBackendScope(null);
  }, []);

  // Automatically redirect on 401 Unauthorized or token expiry
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      window.location.href = '/login';
    };
    window.addEventListener('okobiz:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('okobiz:unauthorized', handleUnauthorized);
  }, [logout]);

  const establishSession = useCallback((userId: string, assignmentId: string) => {
    setSession({ userId, assignmentId });
    const foundUser = directoryUsers.find((u) => u.userId === userId || u.employeeId === userId) || dynamicUser;
    const asg = foundUser?.assignments.find((a) => a.id === assignmentId);
    if (asg?.companyId) {
      localStorage.setItem(ACTIVE_ORG_KEY, asg.companyId);
    }
  }, [dynamicUser]);

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
          if (targetAssignment?.companyId) {
            localStorage.setItem(ACTIVE_ORG_KEY, targetAssignment.companyId);
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
      } else if (targetAssignment?.companyId) {
        localStorage.setItem(ACTIVE_ORG_KEY, targetAssignment.companyId);
      }

      setSession({ userId: user.userId, assignmentId });
    },
    [user],
  );

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
