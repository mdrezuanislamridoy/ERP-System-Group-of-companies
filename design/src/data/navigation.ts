import type React from 'react';
import {
  ActivityIcon,
  BarChart3Icon,
  BoxesIcon,
  BuildingIcon,
  CalendarCheckIcon,
  CircleDollarSignIcon,
  ClipboardListIcon,
  FileTextIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  ListTreeIcon,
  NetworkIcon,
  ReceiptIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
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
  { label: 'Employees', to: '/employees', icon: UsersIcon, permission: 'employee.read' },
  { label: 'Organization Chart', to: '/org-chart', icon: NetworkIcon, permission: 'group.read' }]

},
{
  label: 'Finance',
  items: [
  {
    label: 'Accounting',
    icon: CircleDollarSignIcon,
    permission: 'finance.read',
    children: [
    { label: 'Overview', to: '/finance' },
    { label: 'Chart of Accounts', to: '/finance/accounts' }]

  },
  { label: 'Invoices', to: '/finance/invoices', icon: ReceiptIcon, permission: 'invoice.read' },
  { label: 'Reports', to: '/reports', icon: BarChart3Icon, permission: 'reports.read' }]

},
{
  label: 'Operations',
  items: [
  { label: 'Procurement', to: '/procurement', icon: TruckIcon, permission: 'pr.read' },
  { label: 'Purchase Requests', to: '/procurement/requests', icon: FileTextIcon, permission: 'pr.read' },
  { label: 'Inventory', to: '/inventory', icon: BoxesIcon, permission: 'inventory.read' },
  { label: 'Warehouses', to: '/inventory/warehouses', icon: WarehouseIcon, permission: 'inventory.read' }]

},
{
  label: 'People',
  items: [
  { label: 'Attendance & Leave', to: '/hr', icon: CalendarCheckIcon, permission: 'employee.read' }]

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