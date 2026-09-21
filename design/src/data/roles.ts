import type { RoleKey } from '../types';

/**
 * Scope modes from the IAM architecture doc (architecture/src/data/sections/access.ts,
 * section "RBAC / ABAC / Scope Model"). Only SELF and SUBTREE are used by seed data today;
 * SUBTREE_EXCEPT / NODE / CROSS are modeled so the type stays aligned with the architecture.
 */
export type ScopeMode = 'SELF' | 'NODE' | 'SUBTREE' | 'SUBTREE_EXCEPT' | 'CROSS';

export interface RoleTemplate {
  key: string;
  label: string;
  /** Which of the four UI levels this role drives — dashboard, home route, nav set. */
  level: RoleKey;
  description: string;
  permissions: string[];
  /** Flags this role in IAM as requiring dual approval / MFA per the architecture's role-hierarchy rules. */
  privileged?: boolean;
  approvalLimit?: number;
}

/**
 * Seeded role templates — a starting point, not a fixed enum, per
 * architecture "Role Hierarchy, Position and Job Title". Every company can clone
 * and adjust these; this catalog only backs the frontend prototype.
 */
export const roleTemplates: Record<string, RoleTemplate> = {
  'group-super-admin': {
    key: 'group-super-admin',
    label: 'Group Super Admin',
    level: 'group-exec',
    description: 'Platform configuration and identity administration. No default business data access.',
    permissions: ['iam.manage', 'audit.read', 'settings.manage', 'workflow.manage', 'company.read', 'self.read'],
    privileged: true
  },
  'group-ceo': {
    key: 'group-ceo',
    label: 'Group Chief Executive Officer',
    level: 'group-exec',
    description: 'Read-wide across every company; approves at group thresholds.',
    permissions: [
    'group.read', 'company.read', 'company.manage', 'finance.read', 'finance.approve',
    'invoice.read', 'invoice.create', 'invoice.update', 'invoice.approve', 'invoice.cancel',
    'employee.read', 'employee.update', 'payroll.read', 'pr.read', 'pr.approve', 'po.create',
    'inventory.read', 'workflow.manage', 'audit.read', 'iam.manage', 'settings.manage', 'reports.read',
    'sensitive.salary.read', 'sensitive.nid.read', 'sensitive.bank.read', 'sensitive.export',
    'self.read']

  },
  'group-cfo': {
    key: 'group-cfo',
    label: 'Group Chief Financial Officer',
    level: 'group-exec',
    description: 'Group-wide finance authority — approvals, consolidated reporting, audit visibility.',
    permissions: [
    'group.read', 'company.read', 'finance.read', 'finance.approve', 'invoice.read', 'invoice.create',
    'invoice.update', 'invoice.approve', 'invoice.cancel', 'payroll.read', 'pr.read', 'pr.approve',
    'reports.read', 'audit.read',
    'sensitive.salary.read', 'sensitive.bank.read', 'sensitive.export',
    'self.read'],

    approvalLimit: 5000000
  },
  'group-audit': {
    key: 'group-audit',
    label: 'Group Audit & Compliance',
    level: 'group-exec',
    description: 'Reads everything across the group, writes nothing. Exports are controlled.',
    permissions: [
    'group.read', 'company.read', 'finance.read', 'invoice.read', 'employee.read', 'payroll.read',
    'pr.read', 'inventory.read', 'reports.read', 'audit.read',
    'sensitive.salary.read', 'sensitive.nid.read', 'sensitive.bank.read',
    'self.read'],

    privileged: true
  },
  'group-it-admin': {
    key: 'group-it-admin',
    label: 'Group IT Admin',
    level: 'group-exec',
    description: 'User lifecycle, sessions and integrations for the whole group.',
    permissions: ['group.read', 'company.read', 'iam.manage', 'audit.read', 'settings.manage', 'self.read'],
    privileged: true
  },
  'company-admin': {
    key: 'company-admin',
    label: 'Company Admin',
    level: 'company-exec',
    description: 'Company configuration and module settings.',
    permissions: ['company.read', 'company.manage', 'settings.manage', 'employee.read', 'audit.read', 'self.read']
  },
  'company-ceo': {
    key: 'company-ceo',
    label: 'Chief Executive Officer / MD',
    level: 'company-exec',
    description: 'Runs one company — finance approvals, workforce and inventory oversight.',
    permissions: [
    'company.read', 'finance.read', 'finance.approve', 'invoice.read', 'invoice.create', 'invoice.update',
    'invoice.approve', 'employee.read', 'payroll.read', 'pr.read', 'pr.approve', 'inventory.read',
    'audit.read', 'reports.read', 'settings.manage',
    'sensitive.salary.read', 'sensitive.nid.read', 'sensitive.bank.read', 'sensitive.export',
    'self.read'],

    approvalLimit: 2000000
  },
  'company-cfo': {
    key: 'company-cfo',
    label: 'Chief Financial Officer',
    level: 'company-exec',
    description: 'Company-level finance authority and approvals.',
    permissions: [
    'company.read', 'finance.read', 'finance.approve', 'invoice.read', 'invoice.create', 'invoice.update',
    'invoice.approve', 'payroll.read', 'pr.read', 'pr.approve', 'reports.read', 'audit.read',
    'sensitive.salary.read', 'sensitive.bank.read',
    'self.read'],

    approvalLimit: 1500000
  },
  'hr-head': {
    key: 'hr-head',
    label: 'Head of Human Resources',
    level: 'company-exec',
    description: 'Workforce records, payroll visibility and HR reporting for one company.',
    permissions: ['company.read', 'employee.read', 'employee.update', 'payroll.read', 'reports.read', 'sensitive.salary.read', 'sensitive.nid.read', 'sensitive.bank.read', 'sensitive.export', 'self.read']
  },
  'it-head': {
    key: 'it-head',
    label: 'Head of Information Technology',
    level: 'company-exec',
    description: 'Identity, security settings and audit visibility for one company.',
    permissions: ['company.read', 'iam.manage', 'audit.read', 'settings.manage', 'self.read']
  },
  'operations-head': {
    key: 'operations-head',
    label: 'Head of Operations',
    level: 'company-exec',
    description: 'Procurement, inventory and fleet/production oversight for one company.',
    permissions: ['company.read', 'pr.read', 'pr.approve', 'po.create', 'inventory.read', 'reports.read', 'self.read'],
    approvalLimit: 500000
  },
  'department-manager': {
    key: 'department-manager',
    label: 'Department Manager',
    level: 'department-head',
    description: 'Runs one department — approvals, invoices and reports scoped to that subtree.',
    permissions: [
    'company.read', 'finance.read', 'invoice.read', 'invoice.create', 'invoice.update', 'invoice.approve',
    'employee.read', 'pr.read', 'pr.approve', 'inventory.read', 'reports.read', 'self.read'],

    approvalLimit: 500000
  },
  'finance-auditor': {
    key: 'finance-auditor',
    label: 'Finance Auditor',
    level: 'company-exec',
    description: 'Read-only finance access granted for a cross-company audit assignment.',
    permissions: ['company.read', 'finance.read', 'invoice.read', 'reports.read', 'audit.read', 'self.read']
  },
  'group-finance-viewer': {
    key: 'group-finance-viewer',
    label: 'Group Finance Viewer',
    level: 'group-exec',
    description: 'Read-only consolidated finance view across the group — no approval rights.',
    permissions: ['group.read', 'finance.read', 'invoice.read', 'reports.read', 'self.read']
  },
  supervisor: {
    key: 'supervisor',
    label: 'Supervisor',
    level: 'department-head',
    description: 'Oversees a team or site — requests, stock visibility and reporting.',
    permissions: ['company.read', 'employee.read', 'pr.read', 'inventory.read', 'reports.read', 'self.read']
  },
  'team-lead': {
    key: 'team-lead',
    label: 'Team Lead',
    level: 'department-head',
    description: 'Coordinates a small team — visibility into team members and requests.',
    permissions: ['employee.read', 'pr.read', 'self.read']
  },
  staff: {
    key: 'staff',
    label: 'Staff',
    level: 'employee',
    description: 'Baseline self-service, plus the ability to raise requests.',
    permissions: ['self.read', 'pr.read']
  },
  employee: {
    key: 'employee',
    label: 'Employee',
    level: 'employee',
    description: 'Baseline self-service — auto-granted with employment.',
    permissions: ['self.read']
  },
  'super-user': {
    key: 'super-user',
    label: 'Super User (all permissions)',
    level: 'group-exec',
    description:
    'Every permission in the system, union of all role templates. Test/demo account only — no real organization would grant this as a role; it exists to preview every screen and action without switching accounts.',
    permissions: [
    'group.read', 'company.read', 'company.manage', 'finance.read', 'finance.approve',
    'invoice.read', 'invoice.create', 'invoice.update', 'invoice.approve', 'invoice.cancel',
    'employee.read', 'employee.update', 'payroll.read', 'pr.read', 'pr.approve', 'po.create',
    'inventory.read', 'workflow.manage', 'audit.read', 'iam.manage', 'settings.manage',
    'reports.read',
    'sensitive.salary.read', 'sensitive.nid.read', 'sensitive.bank.read', 'sensitive.export',
    'self.read'],

    privileged: true
  }
};
