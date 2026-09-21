import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { directoryUsers, findUserByUserId, resolveUserScope, type Assignment, type DirectoryUser } from '../data/directory';
import type { UserScope } from '../types';

const STORAGE_KEY = 'abc-erp-session';

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
  /** Validates credentials and account status. Does NOT establish a session — the
   * caller (Login page) still has to resolve which assignment becomes active,
   * exactly like the architecture doc's "switching context is an explicit, audited
   * action" rule for context selection after authentication. */
  login: (userId: string, password: string) => LoginResult;
  /** Establishes the session for an already-validated user + chosen assignment. */
  establishSession: (userId: string, assignmentId: string) => void;
  /** Changes the active assignment for the signed-in user (workspace switch). */
  switchAssignment: (assignmentId: string) => void;
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

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const [session, setSession] = useState<StoredSession | null>(readStoredSession);

  useEffect(() => {
    try {
      if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sessionStorage unavailable (private mode, etc.) — session just won't survive a reload.
    }
  }, [session]);

  const user = useMemo(() => {
    if (!session) return null;
    const found = directoryUsers.find((u) => u.userId === session.userId);
    return found && found.status === 'active' ? found : null;
  }, [session]);

  const assignment = useMemo(() => {
    if (!user || !session) return null;
    return user.assignments.find((a) => a.id === session.assignmentId) ?? user.assignments[0] ?? null;
  }, [user, session]);

  const login = useCallback((userIdRaw: string, password: string): LoginResult => {
    const found = findUserByUserId(userIdRaw);
    if (!found || found.password !== password) {
      return { ok: false, error: 'Invalid user ID or password.' };
    }
    if (found.status === 'suspended') {
      return { ok: false, error: 'This account has been suspended by an administrator. Contact Group IT.' };
    }
    if (found.status === 'inactive') {
      return { ok: false, error: 'This account is inactive. Contact your HR administrator.' };
    }
    return { ok: true, user: found };
  }, []);

  const establishSession = useCallback((userId: string, assignmentId: string) => {
    setSession({ userId, assignmentId });
  }, []);

  const switchAssignment = useCallback(
    (assignmentId: string) => {
      if (!user) return;
      setSession({ userId: user.userId, assignmentId });
    },
    [user]
  );

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  const scope = useMemo<UserScope>(() => {
    if (!assignment) return DEFAULT_SCOPE;
    return resolveUserScope(assignment, user);
  }, [assignment, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      assignment,
      scope,
      isAuthenticated: Boolean(user && assignment),
      login,
      establishSession,
      switchAssignment,
      logout
    }),
    [user, assignment, scope, login, establishSession, switchAssignment, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
