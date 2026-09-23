import type { ScopeMode } from './roles';
import type { UserScope } from '../types';

/**
 * Frontend-only identity directory. Mirrors the architecture doc's IAM model
 * (architecture/src/data/sections/access.ts — Person / User / Employment /
 * RoleAssignment as independent records) closely enough to demo real RBAC,
 * without a backend: no hashing, no session service, no MFA. Passwords here
 * are demo-only and visible in the login screen's "Demo accounts" panel.
 */
export interface Assignment {
  id: string;
  roleKey: string;
  /** null = group-wide scope (no single company) */
  companyId: string | null;
  orgLabel: string;
  scopeMode: ScopeMode;
  /** Overrides the role template's label when this person carries a distinct title (e.g. "Managing Director"). */
  title?: string;
  /** Explicit ABAC scope restrictions (company, branch, department, financial approval threshold). */
  scope?: Partial<UserScope>;
}

/**
 * Derives the effective ABAC UserScope from an assignment and user profile,
 * falling back to secure role-level defaults.
 */
export function resolveUserScope(assignment: Assignment, user?: DirectoryUser | null): UserScope {
  const isGroup = assignment.companyId === null;
  const companyId = assignment.companyId;

  // Default allowed companies: group-wide wildcard or the specific company
  const defaultCompanies: string[] = isGroup
    ? ['*']
    : companyId
    ? [companyId, companyId.replace(/^c-/, 'le-')]
    : [];

  // Default financial approval limits based on executive level
  let defaultLimit = 0;
  if (assignment.roleKey === 'group-ceo') defaultLimit = Infinity;
  else if (assignment.roleKey === 'group-cfo') defaultLimit = 50_000_000;
  else if (assignment.roleKey === 'group-super-admin') defaultLimit = 10_000_000;
  else if (assignment.roleKey === 'company-ceo') defaultLimit = 5_000_000;
  else if (assignment.roleKey === 'company-cfo') defaultLimit = 2_500_000;
  else if (assignment.roleKey === 'department-manager') defaultLimit = 500_000;

  // Default branch permissions
  const defaultBranches: string[] = isGroup || assignment.roleKey.includes('ceo') || assignment.roleKey.includes('cfo') || assignment.roleKey.includes('audit')
    ? ['*']
    : user?.branch
    ? [user.branch, 'bp-foods-hq', 'b-hq']
    : ['*'];

  // Default department permissions
  const defaultDepartments: string[] = isGroup || assignment.roleKey.includes('ceo')
    ? ['*']
    : user?.department
    ? [user.department, 'Finance']
    : ['*'];

  return {
    allowedCompanyIds: assignment.scope?.allowedCompanyIds ?? defaultCompanies,
    allowedBranchIds: assignment.scope?.allowedBranchIds ?? defaultBranches,
    allowedDepartmentIds: assignment.scope?.allowedDepartmentIds ?? defaultDepartments,
    financialApprovalLimit: assignment.scope?.financialApprovalLimit ?? defaultLimit,
  };
}


export type AccountStatus = 'active' | 'suspended' | 'inactive';

export interface DirectoryUser {
  userId: string;
  password: string;
  personName: string;
  initials: string;
  email: string;
  employeeId: string;
  department: string;
  branch: string;
  status: AccountStatus;
  assignments: Assignment[];
}

const DEMO_PASSWORD = 'Demo@123';

export const directoryUsers: DirectoryUser[] = [
{
  userId: 'ayesha.karim',
  password: DEMO_PASSWORD,
  personName: 'Ayesha Karim',
  initials: 'AK',
  email: 'ayesha.karim@abcgroup.com',
  employeeId: 'EMP-10001',
  department: 'Group Executive Office',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  assignments: [
  { id: 'asn-01', roleKey: 'group-ceo', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' }]

},
{
  userId: 'faisal.ahmed',
  password: DEMO_PASSWORD,
  personName: 'Faisal Ahmed',
  initials: 'FA',
  email: 'faisal.ahmed@abcgroup.com',
  employeeId: 'EMP-10002',
  department: 'Group IT',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  assignments: [
  { id: 'asn-02', roleKey: 'group-super-admin', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' }]

},
{
  userId: 'nusrat.jahan',
  password: DEMO_PASSWORD,
  personName: 'Nusrat Jahan',
  initials: 'NJ',
  email: 'nusrat.jahan@abcgroup.com',
  employeeId: 'EMP-10003',
  department: 'Group Finance',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  assignments: [
  { id: 'asn-03', roleKey: 'group-cfo', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' }]

},
{
  userId: 'zahid.hasan',
  password: DEMO_PASSWORD,
  personName: 'Zahid Hasan',
  initials: 'ZH',
  email: 'zahid.hasan@abcgroup.com',
  employeeId: 'EMP-10004',
  department: 'Group Audit & Compliance',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  assignments: [
  { id: 'asn-04', roleKey: 'group-audit', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' }]

},
{
  userId: 'mahfuz.anam',
  password: DEMO_PASSWORD,
  personName: 'Mahfuz Anam',
  initials: 'MA',
  email: 'mahfuz.anam@abcgroup.com',
  employeeId: 'EMP-10101',
  department: 'Executive Office',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  assignments: [
  { id: 'asn-05', roleKey: 'company-ceo', companyId: 'c-foods', orgLabel: 'ABC Foods Ltd.', scopeMode: 'SUBTREE' }]

},
{
  userId: 'nasrin.sultana',
  password: DEMO_PASSWORD,
  personName: 'Nasrin Sultana',
  initials: 'NS',
  email: 'nasrin.s@abcgroup.com',
  employeeId: 'EMP-10410',
  department: 'Finance',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  assignments: [
  {
    id: 'asn-06',
    roleKey: 'company-cfo',
    companyId: 'c-foods',
    orgLabel: 'ABC Foods Ltd. · Finance',
    scopeMode: 'SUBTREE',
    title: 'Head of Finance'
  }]

},
{
  userId: 'rahim.ahmed',
  password: DEMO_PASSWORD,
  personName: 'Rahim Ahmed',
  initials: 'RA',
  email: 'rahim.ahmed@abcgroup.com',
  employeeId: 'EMP-10241',
  department: 'Finance',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  // The exact multi-assignment example from the architecture doc's IAM section:
  // one account, three assignments, three different effective permission sets.
  assignments: [
  {
    id: 'asn-07',
    roleKey: 'department-manager',
    companyId: 'c-foods',
    orgLabel: 'ABC Foods Ltd. · Finance',
    scopeMode: 'SUBTREE',
    title: 'Finance Manager',
    scope: {
      allowedCompanyIds: ['c-foods', 'le-foods'],
      allowedBranchIds: ['bp-foods-hq', 'b-hq', 'Corporate HQ', 'Corporate HQ — Gulshan'],
      allowedDepartmentIds: ['d-foods-fin', 'Finance'],
      financialApprovalLimit: 500000,
    }
  },
  {
    id: 'asn-08',
    roleKey: 'finance-auditor',
    companyId: 'c-grocery',
    orgLabel: 'ABC Grocery Ltd.',
    scopeMode: 'SUBTREE',
    scope: {
      allowedCompanyIds: ['c-grocery', 'le-grocery'],
      allowedBranchIds: ['*'],
      allowedDepartmentIds: ['*'],
      financialApprovalLimit: 0,
    }
  },
  {
    id: 'asn-09',
    roleKey: 'group-finance-viewer',
    companyId: null,
    orgLabel: 'ABC GROUP',
    scopeMode: 'SUBTREE',
    scope: {
      allowedCompanyIds: ['*'],
      allowedBranchIds: ['*'],
      allowedDepartmentIds: ['*'],
      financialApprovalLimit: 0,
    }
  }]

},
{
  userId: 'farhana.zaman',
  password: DEMO_PASSWORD,
  personName: 'Farhana Zaman',
  initials: 'FZ',
  email: 'farhana.zaman@abcgroup.com',
  employeeId: 'EMP-10201',
  department: 'Executive Office',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  assignments: [
  {
    id: 'asn-10',
    roleKey: 'company-ceo',
    companyId: 'c-tech',
    orgLabel: 'ABC Technologies Ltd.',
    scopeMode: 'SUBTREE',
    title: 'Managing Director'
  }]

},
{
  userId: 'sohel.rana',
  password: DEMO_PASSWORD,
  personName: 'Sohel Rana',
  initials: 'SR',
  email: 'sohel.r@abcgroup.com',
  employeeId: 'EMP-10712',
  department: 'Fleet',
  branch: 'Chattogram Distribution Center',
  status: 'active',
  assignments: [
  {
    id: 'asn-11',
    roleKey: 'operations-head',
    companyId: 'c-transport',
    orgLabel: 'ABC Transport Ltd. · Fleet Operations',
    scopeMode: 'SUBTREE',
    title: 'Fleet Operations Head'
  }]

},
{
  userId: 'shirin.akter',
  password: DEMO_PASSWORD,
  personName: 'Shirin Akter',
  initials: 'SA',
  email: 'shirin.akter@abcgroup.com',
  employeeId: 'EMP-10301',
  department: 'Executive Office',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  assignments: [
  { id: 'asn-12', roleKey: 'company-ceo', companyId: 'c-grocery', orgLabel: 'ABC Grocery Ltd.', scopeMode: 'SUBTREE' }]

},
{
  userId: 'sabina.yasmin',
  password: DEMO_PASSWORD,
  personName: 'Sabina Yasmin',
  initials: 'SY',
  email: 'sabina.y@abcgroup.com',
  employeeId: 'EMP-10501',
  department: 'Finance',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  assignments: [
  {
    id: 'asn-13',
    roleKey: 'staff',
    companyId: 'c-foods',
    orgLabel: 'ABC Foods Ltd. · Finance',
    scopeMode: 'SELF',
    title: 'Accounts Receivable Lead'
  }]

},
{
  userId: 'ayesha.siddika',
  password: DEMO_PASSWORD,
  personName: 'Ayesha Siddika',
  initials: 'AS',
  email: 'ayesha.s@abcgroup.com',
  employeeId: 'EMP-10790',
  department: 'Warehouse',
  branch: 'Chattogram Distribution Center',
  status: 'active',
  assignments: [
  {
    id: 'asn-14',
    roleKey: 'supervisor',
    companyId: 'c-grocery',
    orgLabel: 'ABC Grocery Ltd. · Warehouse',
    scopeMode: 'SUBTREE',
    title: 'Warehouse Supervisor'
  }]

},
{
  userId: 'jubayer.hossain',
  password: DEMO_PASSWORD,
  personName: 'Jubayer Hossain',
  initials: 'JH',
  email: 'jubayer.h@abcgroup.com',
  employeeId: 'EMP-11002',
  department: 'Production',
  branch: 'Gazipur Plant II',
  status: 'active',
  assignments: [
  {
    id: 'asn-15',
    roleKey: 'employee',
    companyId: 'c-foods',
    orgLabel: 'ABC Foods Ltd. · Production',
    scopeMode: 'SELF',
    title: 'Machine Operator'
  }]

},
{
  userId: 'superuser',
  password: DEMO_PASSWORD,
  personName: 'Super User',
  initials: 'SU',
  email: 'superuser@abcgroup.com',
  employeeId: 'EMP-00000',
  department: 'Platform Demo',
  branch: 'Corporate HQ — Gulshan',
  status: 'active',
  // Test/demo account only. Two ways to use it:
  // 1) The merged "Super User" assignment (all permissions at once, the default landing workspace).
  // 2) Every individual role template as its own switchable assignment, so any single role's
  //    authentic restricted view (nav, permissions, dashboard) can be previewed without a
  //    separate login — switch workspaces from the top bar to move between them.
  // Each assignment below is pinned to a different company/department so switching workspaces
  // actually shows a distinct organizational context, not the same company repeated 18 times.
  assignments: [
  { id: 'asn-16', roleKey: 'super-user', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' },
  { id: 'asn-17', roleKey: 'group-super-admin', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' },
  { id: 'asn-18', roleKey: 'group-ceo', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' },
  { id: 'asn-19', roleKey: 'group-cfo', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' },
  { id: 'asn-20', roleKey: 'group-audit', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' },
  { id: 'asn-21', roleKey: 'group-it-admin', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' },
  { id: 'asn-22', roleKey: 'group-finance-viewer', companyId: null, orgLabel: 'ABC GROUP', scopeMode: 'SUBTREE' },
  { id: 'asn-23', roleKey: 'company-admin', companyId: 'c-tech', orgLabel: 'ABC Technologies Ltd.', scopeMode: 'SUBTREE' },
  { id: 'asn-24', roleKey: 'company-ceo', companyId: 'c-transport', orgLabel: 'ABC Transport Ltd.', scopeMode: 'SUBTREE' },
  { id: 'asn-25', roleKey: 'company-cfo', companyId: 'c-grocery', orgLabel: 'ABC Grocery Ltd.', scopeMode: 'SUBTREE' },
  { id: 'asn-26', roleKey: 'hr-head', companyId: 'c-textile', orgLabel: 'ABC Textiles Ltd.', scopeMode: 'SUBTREE' },
  { id: 'asn-27', roleKey: 'it-head', companyId: 'c-pharma', orgLabel: 'ABC Pharma Ltd.', scopeMode: 'SUBTREE' },
  {
    id: 'asn-28',
    roleKey: 'operations-head',
    companyId: 'c-transport',
    orgLabel: 'ABC Transport Ltd. · Fleet Operations',
    scopeMode: 'SUBTREE'
  },
  { id: 'asn-29', roleKey: 'finance-auditor', companyId: 'c-grocery', orgLabel: 'ABC Grocery Ltd.', scopeMode: 'SUBTREE' },
  {
    id: 'asn-30',
    roleKey: 'department-manager',
    companyId: 'c-foods',
    orgLabel: 'ABC Foods Ltd. · Finance',
    scopeMode: 'SUBTREE'
  },
  {
    id: 'asn-31',
    roleKey: 'supervisor',
    companyId: 'c-grocery',
    orgLabel: 'ABC Grocery Ltd. · Warehouse',
    scopeMode: 'SUBTREE'
  },
  {
    id: 'asn-32',
    roleKey: 'team-lead',
    companyId: 'c-textile',
    orgLabel: 'ABC Textiles Ltd. · Production',
    scopeMode: 'SUBTREE'
  },
  { id: 'asn-33', roleKey: 'staff', companyId: 'c-foods', orgLabel: 'ABC Foods Ltd. · Finance', scopeMode: 'SELF' },
  {
    id: 'asn-34',
    roleKey: 'employee',
    companyId: 'c-foods',
    orgLabel: 'ABC Foods Ltd. · Production',
    scopeMode: 'SELF'
  }]

}];


export function findUserByUserId(identifier: string): DirectoryUser | undefined {
  const normalized = identifier.trim().toLowerCase();
  return directoryUsers.find(
    (u) =>
      u.employeeId.toLowerCase() === normalized ||
      u.userId.toLowerCase() === normalized ||
      u.email.toLowerCase() === normalized,
  );
}
