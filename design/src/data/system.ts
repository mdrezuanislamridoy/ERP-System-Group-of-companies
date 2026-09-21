import type { AuditEvent, NotificationItem } from '../types';

export const notifications: NotificationItem[] = [
{ id: 'n1', category: 'Approvals', title: 'Purchase Request requires your approval', meta: 'PR-2026-00192 · ৳850,000 · ABC Foods Ltd.', time: '5 minutes ago', unread: true, tone: 'info' },
{ id: 'n2', category: 'Finance', title: 'Payment failure on supplier invoice', meta: 'INV-2026-001902 · Padma Oil Company', time: '3 hours ago', unread: true, tone: 'danger' },
{ id: 'n3', category: 'HR', title: 'Leave request approved', meta: 'Annual Leave · 18–24 Sep 2026', time: '2 hours ago', unread: true, tone: 'success' },
{ id: 'n4', category: 'Operations', title: 'Stock level below reorder point', meta: 'Edible Oil — Soybean (20L) · Savar WH-01', time: '4 hours ago', unread: false, tone: 'warning' },
{ id: 'n5', category: 'Security', title: 'New device signed in to your account', meta: 'Chrome on Windows · 103.85.12.44 · Dhaka', time: 'Yesterday, 18:04', unread: false, tone: 'warning' },
{ id: 'n6', category: 'System', title: 'Month-end close scheduled', meta: 'Finance module locks 30 Sep, 23:00', time: 'Yesterday, 09:12', unread: false, tone: 'info' },
{ id: 'n7', category: 'Approvals', title: 'Journal entry batch awaiting review', meta: 'JE-2026-4412 · 18 lines', time: '2 days ago', unread: false, tone: 'info' }];


export const auditEvents: AuditEvent[] = [
{ id: 'a1', time: '21 Sep 2026, 10:42:18', user: 'Rahim Ahmed', action: 'APPROVE', resource: 'PO-2026-9282', company: 'ABC Foods Ltd.', ip: '103.85.12.44', device: 'Chrome 141 · Windows', correlation: 'c-8f21a4', before: 'status: pending', after: 'status: approved' },
{ id: 'a2', time: '21 Sep 2026, 10:31:02', user: 'Karim Chowdhury', action: 'UPDATE', resource: 'EMP-10322', company: 'ABC Foods Ltd.', ip: '103.85.12.09', device: 'Safari 18 · macOS', correlation: 'c-8f2199', before: 'grade: G-05', after: 'grade: G-06' },
{ id: 'a3', time: '21 Sep 2026, 09:22:47', user: 'Hasan Mahmud', action: 'LOGIN', resource: 'System', company: 'ABC Foods Ltd.', ip: '119.30.44.2', device: 'Chrome 141 · Android', correlation: 'c-8f2142' },
{ id: 'a4', time: '21 Sep 2026, 08:58:10', user: 'Nasrin Sultana', action: 'EXPORT', resource: 'Trial Balance FY2026', company: 'ABC Foods Ltd.', ip: '103.85.12.51', device: 'Edge 141 · Windows', correlation: 'c-8f20f8' },
{ id: 'a5', time: '20 Sep 2026, 17:40:33', user: 'Mizanur Rahman', action: 'DELETE', resource: 'JE-2026-4390', company: 'ABC Transport Ltd.', ip: '115.42.18.90', device: 'Chrome 140 · Windows', correlation: 'c-8f1c22', before: 'lines: 6', after: 'deleted' },
{ id: 'a6', time: '20 Sep 2026, 16:22:05', user: 'Ayesha Karim', action: 'APPROVE', resource: 'PAY-2026-1938', company: 'ABC GROUP', ip: '103.85.12.01', device: 'Safari 18 · iPadOS', correlation: 'c-8f1b04' },
{ id: 'a7', time: '20 Sep 2026, 14:11:59', user: 'System', action: 'ROLE_GRANT', resource: 'USR-2214 → Finance Approver', company: 'ABC Grocery Ltd.', ip: '—', device: 'Automation', correlation: 'c-8f1980' }];

let auditCounter = 8;

export function recordAuditEvent(entry: {
  user: string;
  action: string;
  resource: string;
  company: string;
  ip?: string;
  device?: string;
  before?: string;
  after?: string;
}): AuditEvent {
  const date = new Date();
  const timeStr = `${date.getDate()} Sep 2026, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  const correlation = `c-sec-${Math.random().toString(36).substring(2, 8)}`;
  const newEvent: AuditEvent = {
    id: `a${auditCounter++}`,
    time: timeStr,
    user: entry.user,
    action: entry.action,
    resource: entry.resource,
    company: entry.company,
    ip: entry.ip ?? '103.85.12.44',
    device: entry.device ?? 'Edge 141 · Windows (ABAC Guard)',
    correlation,
    before: entry.before,
    after: entry.after,
  };
  auditEvents.unshift(newEvent);
  return newEvent;
}



export const activity = [
{ day: 'Today', items: [
  { time: '10:42', text: 'Rahim Ahmed approved Purchase Order PO-2026-9282', tone: 'success' as const },
  { time: '10:31', text: 'Karim Chowdhury updated employment record for Hasan Mahmud', tone: 'info' as const },
  { time: '09:22', text: 'Month-end reconciliation job completed for ABC Foods Ltd.', tone: 'info' as const }]
},
{ day: 'Yesterday', items: [
  { time: '16:22', text: 'Group CFO approved payment PAY-2026-1938 (৳1.24 Cr)', tone: 'success' as const },
  { time: '14:11', text: 'Finance Approver role granted to USR-2214', tone: 'warning' as const },
  { time: '11:05', text: 'Supplier Padma Oil Company flagged for payment failure', tone: 'danger' as const }]
}];


export const alerts = [
{ title: 'ABC Textiles Ltd. margin below 5% threshold', detail: 'Q3 operating margin 4.0% vs group floor 8.0%', tone: 'danger' as const, meta: 'Finance · 2h ago' },
{ title: 'Payroll approval pending for 3 companies', detail: 'September payroll locks in 4 days', tone: 'warning' as const, meta: 'HR · 6h ago' },
{ title: 'Gazipur Plant II warehouse at 91% capacity', detail: 'Inbound shipments may be rejected', tone: 'warning' as const, meta: 'Inventory · 1d ago' },
{ title: '2 privileged accounts without MFA', detail: 'Group IT policy requires MFA for admin roles', tone: 'danger' as const, meta: 'Security · 1d ago' }];


export const sessions = [
{ device: 'Chrome 141 · Windows 11', location: 'Dhaka, BD', ip: '103.85.12.44', last: 'Active now', current: true },
{ device: 'Safari 18 · iPhone 16', location: 'Dhaka, BD', ip: '119.30.44.2', last: '2 hours ago', current: false },
{ device: 'Edge 140 · Windows 10', location: 'Chattogram, BD', ip: '115.42.18.90', last: '3 days ago', current: false }];


export const effectivePermissions = [
{ group: 'Finance', items: [
  { key: 'invoice.read', granted: true, source: 'Finance Manager' },
  { key: 'invoice.create', granted: true, source: 'Finance Manager' },
  { key: 'invoice.approve', granted: true, source: 'Approval Delegate' },
  { key: 'invoice.delete', granted: false, source: '—' },
  { key: 'payment.release', granted: false, source: 'Requires CFO' }]
},
{ group: 'Procurement', items: [
  { key: 'pr.read', granted: true, source: 'Finance Manager' },
  { key: 'pr.approve', granted: true, source: 'Workflow: PR > ৳100k' },
  { key: 'po.create', granted: false, source: '—' }]
},
{ group: 'People', items: [
  { key: 'employee.read', granted: true, source: 'Department scope' },
  { key: 'payroll.read', granted: true, source: 'Finance Manager' },
  { key: 'employee.update', granted: false, source: 'HR only' }]
}];