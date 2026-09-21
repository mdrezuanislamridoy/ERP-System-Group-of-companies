import type React from 'react';
import type { ModuleKey } from '../types';
import {
  ActivityIcon,
  BarChart3Icon,
  BoxesIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarCheckIcon,
  CarIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  ClipboardListIcon,
  FactoryIcon,
  FileTextIcon,
  FolderKanbanIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  ListTreeIcon,
  NetworkIcon,
  ReceiptIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TruckIcon,
  UserCircleIcon,
  UsersIcon,
  WarehouseIcon } from
'lucide-react';

export interface NavItem {
  label: string;
  to?: string;
  icon?: React.ComponentType<{className?: string;}>;
  permission?: string;
  module?: ModuleKey;
  badge?: number;
  children?: NavItem[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
{
  label: 'Main',
  items: [
  { label: 'Dashboard', to: '/', icon: LayoutDashboardIcon },
  { label: 'My Workspace', to: '/me', icon: UserCircleIcon, permission: 'self.read' },
  { label: 'My Approvals', to: '/approvals', icon: ClipboardListIcon, permission: 'pr.approve', badge: 4 }]

},
{
  label: 'Organization',
  items: [
  { label: 'Companies', to: '/companies', icon: BuildingIcon, permission: 'group.read' },
  { label: 'Employees', to: '/employees', icon: UsersIcon, permission: 'employee.read', module: 'hr' },
  { label: 'Organization Chart', to: '/org-chart', icon: NetworkIcon, permission: 'group.read' }]

},
{
  label: 'Finance',
  items: [
  {
    label: 'Accounting',
    icon: CircleDollarSignIcon,
    permission: 'finance.read',
    module: 'finance',
    children: [
    { label: 'Overview', to: '/finance' },
    { label: 'Chart of Accounts', to: '/finance/accounts' }]

  },
  { label: 'Invoices', to: '/finance/invoices', icon: ReceiptIcon, permission: 'invoice.read', module: 'finance' },
  { label: 'Reports', to: '/reports', icon: BarChart3Icon, permission: 'reports.read', module: 'finance' }]

},
{
  label: 'Operations',
  items: [
  { label: 'Procurement', to: '/procurement', icon: TruckIcon, permission: 'pr.read', module: 'procurement' },
  { label: 'Purchase Requests', to: '/procurement/requests', icon: FileTextIcon, permission: 'pr.read', module: 'procurement' },
  { label: 'Inventory', to: '/inventory', icon: BoxesIcon, permission: 'inventory.read', module: 'inventory' },
  { label: 'Warehouses', to: '/inventory/warehouses', icon: WarehouseIcon, permission: 'inventory.read', module: 'inventory' },
  { label: 'Manufacturing', to: '/manufacturing', icon: FactoryIcon, permission: 'inventory.read', module: 'manufacturing' },
  { label: 'Quality Control', to: '/quality', icon: CheckCircle2Icon, permission: 'inventory.read', module: 'quality' },
  { label: 'Fleet & Transport', to: '/fleet', icon: CarIcon, permission: 'pr.read', module: 'fleet' },
  { label: 'Projects & Tasks', to: '/projects', icon: FolderKanbanIcon, permission: 'self.read', module: 'projects' },
  { label: 'Retail POS', to: '/retail', icon: ShoppingBagIcon, permission: 'inventory.read', module: 'retail-pos' }]

},
{
  label: 'People',
  items: [
  { label: 'Attendance & Leave', to: '/hr', icon: CalendarCheckIcon, permission: 'employee.read', module: 'hr' }]

},
{
  label: 'Workflow',
  items: [
  { label: 'Workflow Builder', to: '/workflows/builder', icon: GitBranchIcon, permission: 'workflow.manage' }]

},
{
  label: 'Administration',
  items: [
  { label: 'Users & Roles', to: '/admin/iam', icon: ShieldCheckIcon, permission: 'iam.manage' },
  { label: 'Audit Logs', to: '/admin/audit', icon: ScrollTextIcon, permission: 'audit.read' },
  { label: 'Settings', to: '/settings', icon: SettingsIcon, permission: 'settings.manage' }]

}];


export const employeeNavigation: NavSection[] = [
{
  label: 'Main',
  items: [
  { label: 'My Workspace', to: '/me', icon: LayoutDashboardIcon },
  { label: 'My Profile', to: '/profile', icon: UserCircleIcon }]

},
{
  label: 'Self Service',
  items: [
  { label: 'Attendance', to: '/hr', icon: CalendarCheckIcon },
  { label: 'Leave', to: '/hr?tab=leave', icon: ListTreeIcon },
  { label: 'My Requests', to: '/me?tab=requests', icon: FileTextIcon },
  { label: 'Announcements', to: '/me?tab=announcements', icon: ActivityIcon }]

}];


export const recentContexts = [
{ label: 'ABC Transport → Fleet', to: '/company' },
{ label: 'ABC Foods → Finance', to: '/finance' },
{ label: 'PR-2026-00192', to: '/approvals/PR-2026-00192' }];