export type ScopeMode = 'SELF' | 'NODE' | 'SUBTREE' | 'SUBTREE_EXCEPT' | 'CROSS';

export interface UserScope {
  userId: string;
  assignmentId: string;
  roleKey: string;
  activeOrgId: string;
  activeCompanyId: string | null;
  scopeMode: ScopeMode;
  allowedCompanyIds: string[];
  allowedBranchIds: string[];
  allowedDepartmentIds: string[];
  descendantOrgIds: string[];
  financialApprovalLimit: number;
}

export interface RequestContext {
  correlationId: string;
  user?: {
    id: string;
    personId: string;
    email: string;
    permissions: string[];
  };
  scope?: UserScope;
  ipAddress?: string;
  userAgent?: string;
}
