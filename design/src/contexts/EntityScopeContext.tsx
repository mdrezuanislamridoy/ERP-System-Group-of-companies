import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Company, Employee, Invoice, PurchaseRequest, StockItem, UserScope, ModuleKey } from '../types';
import { companies, legalEntities, branchPlants, group } from '../data/organization';
import { recordAuditEvent } from '../data/system';
import { useAuth } from './AuthContext';

export interface ScopeBranchItem {
  id: string;
  name: string;
  companyId: string;
  type?: string;
  city?: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  reasonCode?: 'ERR_ABAC_COMPANY_ISOLATION' | 'ERR_BRANCH_RESTRICTION' | 'ERR_DEPARTMENT_RESTRICTION' | 'ERR_FINANCIAL_LIMIT_EXCEEDED';
  message?: string;
  attemptedEntity?: string;
  allowedEntities?: string[];
  limit?: number;
  shortfall?: number;
}

export interface EntityScopeContextValue {
  scope: UserScope;
  /** Active company ID lens (null = all allowed companies / group view) */
  activeCompanyId: string | null;
  /** Human-readable active company name */
  activeCompanyName: string;
  /** Active branch ID lens (null = all branches within active company) */
  activeBranchId: string | null;
  /** Human-readable active branch name */
  activeBranchName: string;
  /** List of Company objects the user is authorized to access */
  allowedCompanies: Company[];
  /** List of branches/plants within the current active company context that user can access */
  allowedBranches: ScopeBranchItem[];
  /** True if user has permission to access more than 1 legal entity */
  isMultiCompany: boolean;
  /** True if user has access to multiple branches within the active company */
  isMultiBranch: boolean;
  /** Change active company context */
  setActiveCompanyId: (companyId: string | null) => void;
  /** Change active branch context */
  setActiveBranchId: (branchId: string | null) => void;
  /** Check if a company ID or company name is within user scope */
  canAccessCompany: (companyIdOrName: string | null | undefined) => boolean;
  /** Check if a branch ID or branch name is within user scope */
  canAccessBranch: (branchIdOrName: string | null | undefined) => boolean;
  /** Check if user is authorized to approve an expenditure amount */
  canApproveAmount: (amount: number) => { allowed: boolean; limit: number; shortfall: number };
  /** Complete entity authorization validation */
  checkEntityAccess: (opts: {
    company?: string;
    branch?: string;
    department?: string;
    amount?: number;
    resourceName?: string;
  }) => AccessCheckResult;

  // ─── Automated Dataset Filters ──────────────────────────────────────────────
  filterEmployees: (list: Employee[]) => Employee[];
  filterInvoices: (list: Invoice[]) => Invoice[];
  filterPurchaseRequests: (list: PurchaseRequest[]) => PurchaseRequest[];
  filterStock: (list: StockItem[]) => StockItem[];

  // ─── Module & Feature Configuration Engine (ORG-04) ───────────────────────
  companyModules: Record<string, ModuleKey[]>;
  isModuleEnabled: (moduleKey?: ModuleKey, companyId?: string | null) => boolean;
  toggleCompanyModule: (companyId: string, moduleKey: ModuleKey, enabled: boolean) => void;
  setCompanyModulesPreset: (companyId: string, modules: ModuleKey[]) => void;
}

const EntityScopeContext = createContext<EntityScopeContextValue | null>(null);

/** Helper to normalize and map between company IDs and company names */
function normalizeCompanyId(val: string | null | undefined): string | null {
  if (!val) return null;
  const clean = val.trim().toLowerCase();
  if (clean === '*' || clean === 'all') return '*';
  
  // Exact match on company ID
  const direct = companies.find(c => c.id.toLowerCase() === clean || c.id.replace(/^c-/, 'le-').toLowerCase() === clean);
  if (direct) return direct.id;

  // Match by name or short name
  const byName = companies.find(c => c.name.toLowerCase() === clean || c.short.toLowerCase() === clean);
  if (byName) return byName.id;

  const byLegal = legalEntities.find(le => le.id.toLowerCase() === clean || le.name.toLowerCase() === clean || le.short.toLowerCase() === clean);
  if (byLegal) return byLegal.id.replace(/^le-/, 'c-');

  return val;
}

export function EntityScopeProvider({ children }: { children: React.ReactNode }) {
  const { assignment, scope } = useAuth();

  // Determine which companies user is allowed to access
  const isWildcardCompany = scope.allowedCompanyIds.includes('*');
  const allowedCompanies = useMemo(() => {
    if (isWildcardCompany) return companies;
    const allowedNorm = new Set(scope.allowedCompanyIds.map(id => normalizeCompanyId(id)).filter(Boolean));
    return companies.filter(c => allowedNorm.has(c.id) || allowedNorm.has(c.id.replace(/^c-/, 'le-')));
  }, [isWildcardCompany, scope.allowedCompanyIds]);

  const isMultiCompany = isWildcardCompany || allowedCompanies.length > 1;

  // Active Company State
  const initialCompanyId = useMemo(() => {
    if (assignment?.companyId) {
      return normalizeCompanyId(assignment.companyId);
    }
    if (!isWildcardCompany && allowedCompanies.length > 0) {
      return allowedCompanies[0].id;
    }
    return null; // Group consolidated view
  }, [assignment?.companyId, isWildcardCompany, allowedCompanies]);

  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(initialCompanyId);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);

  // ─── Dynamic Module Configuration State (ORG-04) ───────────────────────────
  const [companyModules, setCompanyModules] = useState<Record<string, ModuleKey[]>>(() => {
    const map: Record<string, ModuleKey[]> = {};
    companies.forEach((c) => {
      map[c.id] = [...c.enabledModules];
      map[c.id.replace(/^c-/, 'le-')] = [...c.enabledModules];
    });
    return map;
  });

  // Sync when assignment changes
  useEffect(() => {
    if (assignment?.companyId) {
      setActiveCompanyIdState(normalizeCompanyId(assignment.companyId));
    } else if (isWildcardCompany) {
      setActiveCompanyIdState(null);
    } else if (allowedCompanies.length > 0) {
      setActiveCompanyIdState(allowedCompanies[0].id);
    } else {
      setActiveCompanyIdState(null);
    }
    setActiveBranchIdState(null);
  }, [assignment?.id, assignment?.companyId, isWildcardCompany, allowedCompanies]);

  // Allowed Branches for current active company
  const isWildcardBranch = scope.allowedBranchIds.includes('*');
  const allowedBranches = useMemo<ScopeBranchItem[]>(() => {
    if (!activeCompanyId) return [];

    const normCo = activeCompanyId.replace(/^c-/, 'le-');
    const bps = branchPlants.filter(bp => bp.companyId === normCo || bp.companyId === activeCompanyId);

    if (isWildcardBranch) {
      return bps.map(bp => ({
        id: bp.id,
        name: bp.name,
        companyId: activeCompanyId,
        type: bp.type,
        city: bp.city,
      }));
    }

    const branchSet = new Set(scope.allowedBranchIds.map(b => b.toLowerCase()));
    return bps
      .filter(bp => branchSet.has(bp.id.toLowerCase()) || branchSet.has(bp.name.toLowerCase()))
      .map(bp => ({
        id: bp.id,
        name: bp.name,
        companyId: activeCompanyId,
        type: bp.type,
        city: bp.city,
      }));
  }, [activeCompanyId, isWildcardBranch, scope.allowedBranchIds]);

  const isMultiBranch = isWildcardBranch || allowedBranches.length > 1;

  // Active Company Name
  const activeCompanyName = useMemo(() => {
    if (!activeCompanyId) return group.name;
    const found = companies.find(c => c.id === activeCompanyId);
    return found ? found.name : group.name;
  }, [activeCompanyId]);

  // Active Branch Name
  const activeBranchName = useMemo(() => {
    if (!activeBranchId) return 'All Branches';
    const found = allowedBranches.find(b => b.id === activeBranchId);
    return found ? found.name : 'All Branches';
  }, [activeBranchId, allowedBranches]);

  // Set Company with ABAC validation
  const setActiveCompanyId = useCallback((id: string | null) => {
    if (id === null) {
      if (isWildcardCompany) {
        setActiveCompanyIdState(null);
        setActiveBranchIdState(null);
      }
      return;
    }
    const norm = normalizeCompanyId(id);
    const isAllowed = isWildcardCompany || allowedCompanies.some(c => c.id === norm);
    if (isAllowed) {
      setActiveCompanyIdState(norm);
      setActiveBranchIdState(null);
    }
  }, [isWildcardCompany, allowedCompanies]);

  // Set Branch with ABAC validation
  const setActiveBranchId = useCallback((branchId: string | null) => {
    if (branchId === null) {
      setActiveBranchIdState(null);
      return;
    }
    if (isWildcardBranch || allowedBranches.some(b => b.id === branchId)) {
      setActiveBranchIdState(branchId);
    }
  }, [isWildcardBranch, allowedBranches]);

  // Company Access Check
  const canAccessCompany = useCallback((companyIdOrName: string | null | undefined): boolean => {
    if (!companyIdOrName) return true;
    if (isWildcardCompany) return true;
    const norm = normalizeCompanyId(companyIdOrName);
    return allowedCompanies.some(c => c.id === norm || c.name.toLowerCase() === companyIdOrName.toLowerCase());
  }, [isWildcardCompany, allowedCompanies]);

  // Branch Access Check
  const canAccessBranch = useCallback((branchIdOrName: string | null | undefined): boolean => {
    if (!branchIdOrName) return true;
    if (isWildcardBranch) return true;
    const clean = branchIdOrName.toLowerCase();
    return scope.allowedBranchIds.some(b => b.toLowerCase() === clean);
  }, [isWildcardBranch, scope.allowedBranchIds]);

  // Financial Approval Limit Check
  const canApproveAmount = useCallback((amount: number) => {
    const limit = scope.financialApprovalLimit;
    const allowed = amount <= limit;
    const shortfall = allowed ? 0 : amount - limit;
    return { allowed, limit, shortfall };
  }, [scope.financialApprovalLimit]);

  // Comprehensive Entity Check
  const checkEntityAccess = useCallback((opts: {
    company?: string;
    branch?: string;
    department?: string;
    amount?: number;
    resourceName?: string;
  }): AccessCheckResult => {
    if (opts.company && !canAccessCompany(opts.company)) {
      return {
        allowed: false,
        reasonCode: 'ERR_ABAC_COMPANY_ISOLATION',
        message: `Entity '${opts.company}' is outside your authorized company scope. Access is denied under company-level data isolation policy.`,
        attemptedEntity: opts.company,
        allowedEntities: allowedCompanies.map(c => c.name),
      };
    }

    if (opts.branch && !canAccessBranch(opts.branch)) {
      return {
        allowed: false,
        reasonCode: 'ERR_BRANCH_RESTRICTION',
        message: `Branch '${opts.branch}' is outside your authorized operating branches.`,
        attemptedEntity: opts.branch,
        allowedEntities: scope.allowedBranchIds,
      };
    }

    if (opts.amount !== undefined) {
      const approvalCheck = canApproveAmount(opts.amount);
      if (!approvalCheck.allowed) {
        return {
          allowed: false,
          reasonCode: 'ERR_FINANCIAL_LIMIT_EXCEEDED',
          message: `Transaction amount of ৳${opts.amount.toLocaleString('en-IN')} exceeds your financial authorization limit of ৳${approvalCheck.limit.toLocaleString('en-IN')}.`,
          limit: approvalCheck.limit,
          shortfall: approvalCheck.shortfall,
        };
      }
    }

    return { allowed: true };
  }, [canAccessCompany, canAccessBranch, canApproveAmount, allowedCompanies, scope.allowedBranchIds]);

  // ─── Automated Dataset Filtering ────────────────────────────────────────────

  const filterEmployees = useCallback((list: Employee[]): Employee[] => {
    return list.filter(emp => {
      // 1. Check if employee's company is in allowed scope
      if (!canAccessCompany(emp.company)) return false;

      // 2. Filter by active company lens if selected
      if (activeCompanyId) {
        const activeName = companies.find(c => c.id === activeCompanyId)?.name;
        if (activeName && emp.company.toLowerCase() !== activeName.toLowerCase()) {
          return false;
        }
      }

      // 3. Filter by active branch lens if selected
      if (activeBranchId) {
        const activeBranch = allowedBranches.find(b => b.id === activeBranchId);
        if (activeBranch) {
          const match = emp.branch.toLowerCase().includes(activeBranch.name.toLowerCase()) ||
            activeBranch.name.toLowerCase().includes(emp.branch.toLowerCase());
          if (!match) return false;
        }
      }

      return true;
    });
  }, [canAccessCompany, activeCompanyId, activeBranchId, allowedBranches]);

  const filterInvoices = useCallback((list: Invoice[]): Invoice[] => {
    return list.filter(inv => {
      // 1. Company scope
      if (!canAccessCompany(inv.company)) return false;

      // 2. Active company lens
      if (activeCompanyId) {
        const activeName = companies.find(c => c.id === activeCompanyId)?.name;
        if (activeName && inv.company.toLowerCase() !== activeName.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [canAccessCompany, activeCompanyId]);

  const filterPurchaseRequests = useCallback((list: PurchaseRequest[]): PurchaseRequest[] => {
    return list.filter(pr => {
      // 1. Company scope
      if (!canAccessCompany(pr.company)) return false;

      // 2. Active company lens
      if (activeCompanyId) {
        const activeName = companies.find(c => c.id === activeCompanyId)?.name;
        if (activeName && pr.company.toLowerCase() !== activeName.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [canAccessCompany, activeCompanyId]);

  const filterStock = useCallback((list: StockItem[]): StockItem[] => {
    return list.filter(item => {
      // If a branch/warehouse is selected in activeBranch, match warehouse
      if (activeBranchId) {
        const branchObj = allowedBranches.find(b => b.id === activeBranchId);
        if (branchObj) {
          const warehouseMatch = item.warehouse.toLowerCase().includes(branchObj.city?.toLowerCase() ?? '') ||
            item.warehouse.toLowerCase().includes(branchObj.name.toLowerCase());
          if (!warehouseMatch) return false;
        }
      }
      return true;
    });
  }, [activeBranchId, allowedBranches]);

  // ─── Module Configuration Handlers (ORG-04) ─────────────────────────────────
  const isModuleEnabled = useCallback((moduleKey?: ModuleKey, targetCompanyId?: string | null): boolean => {
    if (!moduleKey) return true;
    const effectiveCo = targetCompanyId !== undefined ? targetCompanyId : activeCompanyId;
    if (!effectiveCo || effectiveCo === '*' || effectiveCo === 'all') {
      // Group consolidated view: enabled if any company in scope has it enabled
      return Object.values(companyModules).some(mods => mods.includes(moduleKey));
    }
    const norm = normalizeCompanyId(effectiveCo);
    if (!norm) return true;
    const mods = companyModules[norm] || companyModules[norm.replace(/^c-/, 'le-')] || [];
    return mods.includes(moduleKey);
  }, [activeCompanyId, companyModules]);

  const toggleCompanyModule = useCallback((companyId: string, moduleKey: ModuleKey, enabled: boolean) => {
    const norm = normalizeCompanyId(companyId) || companyId;
    const altNorm = norm.startsWith('c-') ? norm.replace(/^c-/, 'le-') : norm.replace(/^le-/, 'c-');
    const targetCo = companies.find(c => c.id === norm || c.id === altNorm);
    const coName = targetCo ? targetCo.name : norm;

    setCompanyModules(prev => {
      const currentList = prev[norm] || targetCo?.enabledModules || [];
      const updated = enabled
        ? (currentList.includes(moduleKey) ? currentList : [...currentList, moduleKey])
        : currentList.filter(m => m !== moduleKey);

      return {
        ...prev,
        [norm]: updated,
        [altNorm]: updated,
      };
    });

    recordAuditEvent({
      user: assignment?.title || 'Group IT Admin',
      action: 'MODULE_TOGGLED',
      resource: `${coName} → Module: ${moduleKey.toUpperCase()}`,
      company: coName,
      before: `enabled: ${!enabled}`,
      after: `enabled: ${enabled}`,
    });
  }, [assignment?.title]);

  const setCompanyModulesPreset = useCallback((companyId: string, modules: ModuleKey[]) => {
    const norm = normalizeCompanyId(companyId) || companyId;
    const altNorm = norm.startsWith('c-') ? norm.replace(/^c-/, 'le-') : norm.replace(/^le-/, 'c-');
    const targetCo = companies.find(c => c.id === norm || c.id === altNorm);
    const coName = targetCo ? targetCo.name : norm;

    setCompanyModules(prev => ({
      ...prev,
      [norm]: [...modules],
      [altNorm]: [...modules],
    }));

    recordAuditEvent({
      user: assignment?.title || 'Group IT Admin',
      action: 'MODULE_PRESET_APPLIED',
      resource: `${coName} → Applied Preset (${modules.length} modules)`,
      company: coName,
      before: 'Custom',
      after: `Enabled modules: ${modules.join(', ')}`,
    });
  }, [assignment?.title]);

  const value = useMemo<EntityScopeContextValue>(() => ({
    scope,
    activeCompanyId,
    activeCompanyName,
    activeBranchId,
    activeBranchName,
    allowedCompanies,
    allowedBranches,
    isMultiCompany,
    isMultiBranch,
    setActiveCompanyId,
    setActiveBranchId,
    canAccessCompany,
    canAccessBranch,
    canApproveAmount,
    checkEntityAccess,
    filterEmployees,
    filterInvoices,
    filterPurchaseRequests,
    filterStock,
    companyModules,
    isModuleEnabled,
    toggleCompanyModule,
    setCompanyModulesPreset,
  }), [
    scope,
    activeCompanyId,
    activeCompanyName,
    activeBranchId,
    activeBranchName,
    allowedCompanies,
    allowedBranches,
    isMultiCompany,
    isMultiBranch,
    setActiveCompanyId,
    setActiveBranchId,
    canAccessCompany,
    canAccessBranch,
    canApproveAmount,
    checkEntityAccess,
    filterEmployees,
    filterInvoices,
    filterPurchaseRequests,
    filterStock,
    companyModules,
    isModuleEnabled,
    toggleCompanyModule,
    setCompanyModulesPreset,
  ]);

  return <EntityScopeContext.Provider value={value}>{children}</EntityScopeContext.Provider>;
}

export function useEntityScope(): EntityScopeContextValue {
  const ctx = useContext(EntityScopeContext);
  if (!ctx) throw new Error('useEntityScope must be used within EntityScopeProvider');
  return ctx;
}
