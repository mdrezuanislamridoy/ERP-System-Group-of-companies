import type { AuditEvent, NotificationItem, ActiveSession, ChainVerificationResult, AuditActor } from '../types';
import { GENESIS_HASH, calculateAuditEventHash } from '../utils/crypto';

export const notifications: NotificationItem[] = [
  { id: 'n1', category: 'Approvals', title: 'Purchase Request requires your approval', meta: 'PR-2026-00192 · ৳850,000 · ABC Foods Ltd.', time: '5 minutes ago', unread: true, tone: 'info' },
  { id: 'n2', category: 'Finance', title: 'Payment failure on supplier invoice', meta: 'INV-2026-001902 · Padma Oil Company', time: '3 hours ago', unread: true, tone: 'danger' },
  { id: 'n3', category: 'HR', title: 'Leave request approved', meta: 'Annual Leave · 18–24 Sep 2026', time: '2 hours ago', unread: true, tone: 'success' },
  { id: 'n4', category: 'Operations', title: 'Stock level below reorder point', meta: 'Edible Oil — Soybean (20L) · Savar WH-01', time: '4 hours ago', unread: false, tone: 'warning' },
  { id: 'n5', category: 'Security', title: 'New device signed in to your account', meta: 'Chrome on Windows · 103.85.12.44 · Dhaka', time: 'Yesterday, 18:04', unread: false, tone: 'warning' },
  { id: 'n6', category: 'System', title: 'Month-end close scheduled', meta: 'Finance module locks 30 Sep, 23:00', time: 'Yesterday, 09:12', unread: false, tone: 'info' },
  { id: 'n7', category: 'Approvals', title: 'Journal entry batch awaiting review', meta: 'JE-2026-4412 · 18 lines', time: '2 days ago', unread: false, tone: 'info' }
];

// ─── Initial Raw Chronological Audit Chain (Genesis to Head) ──────────────────

interface RawSeedEvent {
  id: string;
  time: string;
  user: string;
  action: string;
  resource: string;
  company: string;
  ip: string;
  device: string;
  correlation: string;
  actor: AuditActor;
  justificationReason?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  before?: string;
  after?: string;
}

const rawChronologicalSeed: RawSeedEvent[] = [
  {
    id: 'a7',
    time: '20 Sep 2026, 14:11:59',
    user: 'System',
    action: 'ROLE_GRANT',
    resource: 'USR-2214 → Finance Approver',
    company: 'ABC Grocery Ltd.',
    ip: '127.0.0.1',
    device: 'Automation Engine · Cloud Core',
    correlation: 'c-8f1980',
    actor: {
      userId: 'USR-SYS-01',
      role: 'Automation Engine',
      ip: '127.0.0.1',
      userAgent: 'SystemCron/2.4 (SecurityDaemon)',
      deviceFingerprint: 'dfp_core_srv_01'
    },
    justificationReason: 'Quarterly RBAC entitlement alignment approved by IT Governance',
    before: 'roles: [Viewer]',
    after: 'roles: [Viewer, Finance Approver]',
    beforeState: {
      userId: 'USR-2214',
      name: 'Hasan Mahmud',
      roles: ['Viewer'],
      permissions: ['inventory.read', 'order.read'],
      status: 'active'
    },
    afterState: {
      userId: 'USR-2214',
      name: 'Hasan Mahmud',
      roles: ['Viewer', 'Finance Approver'],
      permissions: ['inventory.read', 'order.read', 'finance.approve', 'invoice.read'],
      status: 'active',
      approvalLimitBdt: 250000
    }
  },
  {
    id: 'a6',
    time: '20 Sep 2026, 16:22:05',
    user: 'Ayesha Karim',
    action: 'APPROVE',
    resource: 'PAY-2026-1938',
    company: 'ABC GROUP',
    ip: '103.85.12.01',
    device: 'Safari 18 · iPadOS',
    correlation: 'c-8f1b04',
    actor: {
      userId: 'USR-CFO-01',
      role: 'Group CFO',
      ip: '103.85.12.01',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
      deviceFingerprint: 'dfp_apple_tab_9a8'
    },
    justificationReason: 'High-value treasury wire release approved per group delegation matrix',
    before: 'status: pending_cfo',
    after: 'status: approved',
    beforeState: {
      paymentId: 'PAY-2026-1938',
      amount: 12400000,
      currency: 'BDT',
      recipient: 'Padma Bridge Railway Project Consortium',
      status: 'pending_cfo',
      releaseAuthorized: false
    },
    afterState: {
      paymentId: 'PAY-2026-1938',
      amount: 12400000,
      currency: 'BDT',
      recipient: 'Padma Bridge Railway Project Consortium',
      status: 'approved',
      releaseAuthorized: true,
      approvedBy: 'Ayesha Karim',
      approvedAt: '2026-09-20T16:22:05Z'
    }
  },
  {
    id: 'a5',
    time: '20 Sep 2026, 17:40:33',
    user: 'Mizanur Rahman',
    action: 'DELETE',
    resource: 'JE-2026-4390',
    company: 'ABC Transport Ltd.',
    ip: '115.42.18.90',
    device: 'Chrome 140 · Windows',
    correlation: 'c-8f1c22',
    actor: {
      userId: 'USR-ACC-03',
      role: 'Accountant',
      ip: '115.42.18.90',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0',
      deviceFingerprint: 'dfp_win_acc_339'
    },
    justificationReason: 'Duplicate unposted draft journal entry discarded before voucher confirmation',
    before: 'lines: 6',
    after: 'deleted',
    beforeState: {
      journalNumber: 'JE-2026-4390',
      isDraft: true,
      lineCount: 6,
      totalDebit: 145000,
      totalCredit: 145000,
      status: 'draft'
    },
    afterState: {
      journalNumber: 'JE-2026-4390',
      isDraft: false,
      lineCount: 0,
      totalDebit: 0,
      totalCredit: 0,
      status: 'purged'
    }
  },
  {
    id: 'a4',
    time: '21 Sep 2026, 08:58:10',
    user: 'Nasrin Sultana',
    action: 'EXPORT',
    resource: 'Trial Balance FY2026',
    company: 'ABC Foods Ltd.',
    ip: '103.85.12.51',
    device: 'Edge 141 · Windows',
    correlation: 'c-8f20f8',
    actor: {
      userId: 'USR-FIN-02',
      role: 'Finance Controller',
      ip: '103.85.12.51',
      userAgent: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) Edge/141.0.0.0',
      deviceFingerprint: 'dfp_edge_fc_122'
    },
    justificationReason: 'Quarterly compliance submission to external statutory audit firm',
    before: 'classification: Confidential',
    after: 'exported: XLSX (420 rows)',
    beforeState: {
      reportType: 'Trial Balance',
      fiscalYear: 2026,
      exportFormat: 'XLSX',
      classification: 'Confidential'
    },
    afterState: {
      reportType: 'Trial Balance',
      fiscalYear: 2026,
      exportFormat: 'XLSX',
      classification: 'Confidential',
      rowsExported: 420,
      watermarked: true,
      digestSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    }
  },
  {
    id: 'a3',
    time: '21 Sep 2026, 09:22:47',
    user: 'Hasan Mahmud',
    action: 'LOGIN',
    resource: 'System',
    company: 'ABC Foods Ltd.',
    ip: '119.30.44.2',
    device: 'Chrome 141 · Android',
    correlation: 'c-8f2142',
    actor: {
      userId: 'USR-OPS-01',
      role: 'Warehouse Manager',
      ip: '119.30.44.2',
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/141.0.0.0 Mobile',
      deviceFingerprint: 'dfp_droid_ops_09'
    },
    justificationReason: 'Mobile barcode scanner terminal authorization',
    beforeState: {
      sessionId: null,
      authStatus: 'unauthenticated'
    },
    afterState: {
      sessionId: 'sess-8f2142',
      authStatus: 'authenticated_mfa',
      mfaMethod: 'TOTP',
      terminal: 'Savar-WH-01-Handheld'
    }
  },
  {
    id: 'a2',
    time: '21 Sep 2026, 10:31:02',
    user: 'Karim Chowdhury',
    action: 'UPDATE',
    resource: 'EMP-10322',
    company: 'ABC Foods Ltd.',
    ip: '103.85.12.09',
    device: 'Safari 18 · macOS',
    correlation: 'c-8f2199',
    actor: {
      userId: 'USR-HR-04',
      role: 'HR Director',
      ip: '103.85.12.09',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      deviceFingerprint: 'dfp_mac_hr_778'
    },
    justificationReason: 'Annual performance evaluation grade increment per Executive Committee approval',
    before: 'grade: G-05',
    after: 'grade: G-06',
    beforeState: {
      employeeId: 'EMP-10322',
      name: 'Hasan Mahmud',
      grade: 'G-05',
      designation: 'Assistant Manager',
      baseSalary: 125000,
      allowance: 25000
    },
    afterState: {
      employeeId: 'EMP-10322',
      name: 'Hasan Mahmud',
      grade: 'G-06',
      designation: 'Manager',
      baseSalary: 155000,
      allowance: 35000
    }
  },
  {
    id: 'a1',
    time: '21 Sep 2026, 10:42:18',
    user: 'Rahim Ahmed',
    action: 'APPROVE',
    resource: 'PO-2026-9282',
    company: 'ABC Foods Ltd.',
    ip: '103.85.12.44',
    device: 'Chrome 141 · Windows',
    correlation: 'c-8f21a4',
    actor: {
      userId: 'USR-PROC-01',
      role: 'Head of Procurement',
      ip: '103.85.12.44',
      userAgent: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) Chrome/141.0.0.0',
      deviceFingerprint: 'dfp_win_proc_441'
    },
    justificationReason: 'Meets 3-way match tolerances and within departmental approved capital budget',
    before: 'status: pending',
    after: 'status: approved',
    beforeState: {
      poNumber: 'PO-2026-9282',
      supplier: 'Delta Agro Feeds Ltd.',
      totalAmount: 850000,
      status: 'pending_approval',
      approvedBy: null
    },
    afterState: {
      poNumber: 'PO-2026-9282',
      supplier: 'Delta Agro Feeds Ltd.',
      totalAmount: 850000,
      status: 'approved',
      approvedBy: 'Rahim Ahmed',
      approvalTimestamp: '2026-09-21T10:42:18Z'
    }
  }
];

// Build initial cryptographically verified chain
function initializeAuditChain(rawSeeds: RawSeedEvent[]): AuditEvent[] {
  let prevHash = GENESIS_HASH;
  const chained: AuditEvent[] = [];

  for (const item of rawSeeds) {
    const blockPayload = {
      previousHash: prevHash,
      id: item.id,
      time: item.time,
      user: item.user,
      action: item.action,
      resource: item.resource,
      company: item.company,
      ip: item.ip,
      device: item.device,
      correlation: item.correlation,
      actor: item.actor,
      justificationReason: item.justificationReason,
      beforeState: item.beforeState,
      afterState: item.afterState,
    };
    const currHash = calculateAuditEventHash(blockPayload);

    const event: AuditEvent = {
      ...item,
      previousHash: prevHash,
      currentHash: currHash,
    };
    chained.push(event);
    prevHash = currHash;
  }

  // Display newest first by default in UI table
  return chained.reverse();
}

export const auditEvents: AuditEvent[] = initializeAuditChain(rawChronologicalSeed);

let auditCounter = 10;

/**
 * Appends a new immutable, tamper-evident audit record to the cryptographic chain.
 */
export function recordAuditEvent(entry: {
  user: string;
  action: string;
  resource: string;
  company: string;
  ip?: string;
  device?: string;
  before?: string;
  after?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  actor?: AuditActor;
  justificationReason?: string;
}): AuditEvent {
  const date = new Date();
  const timeStr = `${date.getDate()} Sep 2026, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  const correlation = `c-sec-${Math.random().toString(36).substring(2, 8)}`;

  // Find latest block in chronological sequence
  // Since auditEvents has newest at index 0, index 0 is currently the latest head
  const previousHead = auditEvents[0];
  const previousHash = previousHead ? previousHead.currentHash : GENESIS_HASH;

  const id = `a${auditCounter++}`;
  const ip = entry.ip ?? '103.85.12.44';
  const device = entry.device ?? 'Edge 141 · Windows (ABAC Guard)';

  const actor: AuditActor = entry.actor ?? {
    userId: entry.user.toLowerCase().replace(/\s+/g, '.'),
    role: 'Operator',
    ip,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'ERP-Web-Client/2.4',
    deviceFingerprint: `dfp_${Math.random().toString(36).substring(2, 10)}`
  };

  const beforeState = entry.beforeState ?? (entry.before ? { summary: entry.before } : undefined);
  const afterState = entry.afterState ?? (entry.after ? { summary: entry.after } : undefined);

  const blockPayload = {
    previousHash,
    id,
    time: timeStr,
    user: entry.user,
    action: entry.action,
    resource: entry.resource,
    company: entry.company,
    ip,
    device,
    correlation,
    actor,
    justificationReason: entry.justificationReason,
    beforeState,
    afterState,
  };

  const currentHash = calculateAuditEventHash(blockPayload);

  const newEvent: AuditEvent = {
    id,
    time: timeStr,
    user: entry.user,
    action: entry.action,
    resource: entry.resource,
    company: entry.company,
    ip,
    device,
    correlation,
    before: entry.before ?? (beforeState ? JSON.stringify(beforeState) : undefined),
    after: entry.after ?? (afterState ? JSON.stringify(afterState) : undefined),
    beforeState,
    afterState,
    actor,
    justificationReason: entry.justificationReason,
    previousHash,
    currentHash,
  };

  auditEvents.unshift(newEvent);
  return newEvent;
}

/**
 * Validates the entire SHA-256 cryptographic chain across all blocks to guarantee zero tampering.
 */
export function verifyAuditChainIntegrity(eventsToCheck?: AuditEvent[]): ChainVerificationResult {
  const events = eventsToCheck ?? [...auditEvents];
  if (events.length === 0) {
    return { isValid: true, totalBlocks: 0, verifiedAt: new Date().toISOString() };
  }

  // Find the genesis block (previousHash is GENESIS_HASH)
  const genesis = events.find((e) => e.previousHash === GENESIS_HASH);
  if (!genesis) {
    return {
      isValid: false,
      totalBlocks: events.length,
      errorMessage: 'Missing genesis block (no block found with initial 0x0 hash link).',
      verifiedAt: new Date().toISOString(),
    };
  }

  // Traverse the chain forward from genesis
  const chain: AuditEvent[] = [genesis];
  let curr = genesis;
  while (chain.length < events.length) {
    const next = events.find((e) => e.previousHash === curr.currentHash);
    if (!next) {
      break;
    }
    chain.push(next);
    curr = next;
  }

  if (chain.length !== events.length) {
    return {
      isValid: false,
      totalBlocks: events.length,
      tamperedEventId: curr.id,
      errorMessage: `Broken hash chain: Block ${curr.id} (${curr.resource}) hash link is broken. Found ${chain.length} connected blocks out of ${events.length}.`,
      verifiedAt: new Date().toISOString(),
    };
  }

  // Verify recalculation of each block's cryptographic hash
  for (let i = 0; i < chain.length; i++) {
    const block = chain[i];
    const expected = calculateAuditEventHash(block);
    if (block.currentHash !== expected) {
      return {
        isValid: false,
        totalBlocks: events.length,
        tamperedIndex: i,
        tamperedEventId: block.id,
        errorMessage: `Tampering detected in block ${block.id} (${block.resource}): Stored hash ${block.currentHash.slice(0, 12)}... does not match recalculated payload digest ${expected.slice(0, 12)}...`,
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  return {
    isValid: true,
    totalBlocks: events.length,
    verifiedAt: new Date().toISOString(),
  };
}

// ─── Auditor Demonstration & Tamper Simulation ───────────────────────────────

let chainBackup: string | null = null;

export function simulateAuditTampering(targetId?: string): { success: boolean; tamperedId: string; description: string } {
  if (!chainBackup) {
    chainBackup = JSON.stringify(auditEvents);
  }
  const target = targetId ? auditEvents.find((e) => e.id === targetId) : auditEvents[0];
  if (!target) return { success: false, tamperedId: '', description: 'Target block not found' };

  // Alter payload without recomputing hash
  if (target.afterState) {
    target.afterState = {
      ...target.afterState,
      unauthorizedModification: true,
      modifiedAt: '2026-09-22T00:00:00Z',
      tamperedAmountBdt: 99999999
    };
  } else {
    target.after = 'TAMPERED_STATE_VALUE';
  }

  return {
    success: true,
    tamperedId: target.id,
    description: `Corrupted block ${target.id} (${target.resource}): inserted unauthorized payload without SHA-256 recalculation.`,
  };
}

export function restoreAuditChain(): boolean {
  if (!chainBackup) return false;
  const restored: AuditEvent[] = JSON.parse(chainBackup);
  auditEvents.length = 0;
  auditEvents.push(...restored);
  chainBackup = null;
  return true;
}

// ─── Issue #22: Active Sessions & Device Management ─────────────────────────

let activeSessionsStore: ActiveSession[] = [
  {
    sessionId: 'sess-dhaka-curr',
    userId: 'USR-001',
    userName: 'Rahim Ahmed',
    device: 'Chrome 141 · Windows 11',
    browser: 'Chrome 141.0',
    os: 'Windows 11 Enterprise',
    ip: '103.85.12.44',
    location: 'Dhaka, Bangladesh',
    lastActive: 'Active now',
    isCurrent: true,
    createdAt: '21 Sep 2026, 08:30:00',
  },
  {
    sessionId: 'sess-ios-mob',
    userId: 'USR-001',
    userName: 'Rahim Ahmed',
    device: 'Safari 18 · iPhone 16 Pro',
    browser: 'Mobile Safari 18.0',
    os: 'iOS 18.1',
    ip: '119.30.44.2',
    location: 'Dhaka, Bangladesh',
    lastActive: '2 hours ago',
    isCurrent: false,
    createdAt: '20 Sep 2026, 21:15:00',
  },
  {
    sessionId: 'sess-ctg-desk',
    userId: 'USR-001',
    userName: 'Rahim Ahmed',
    device: 'Edge 140 · Windows 10',
    browser: 'Microsoft Edge 140.0',
    os: 'Windows 10 Pro',
    ip: '115.42.18.90',
    location: 'Chattogram, Bangladesh',
    lastActive: '3 days ago',
    isCurrent: false,
    createdAt: '18 Sep 2026, 14:02:12',
  },
  {
    sessionId: 'sess-syl-mac',
    userId: 'USR-001',
    userName: 'Rahim Ahmed',
    device: 'Chrome 140 · macOS Sequoia',
    browser: 'Chrome 140.0',
    os: 'macOS 15.0',
    ip: '103.85.12.88',
    location: 'Sylhet Plant, Bangladesh',
    lastActive: '5 days ago',
    isCurrent: false,
    createdAt: '16 Sep 2026, 11:20:45',
  },
];

const sessionListeners: Array<() => void> = [];

function notifySessionListeners() {
  sessionListeners.forEach((fn) => fn());
}

export function subscribeActiveSessions(callback: () => void): () => void {
  sessionListeners.push(callback);
  return () => {
    const idx = sessionListeners.indexOf(callback);
    if (idx >= 0) sessionListeners.splice(idx, 1);
  };
}

export function getActiveSessions(): ActiveSession[] {
  return [...activeSessionsStore];
}

export function revokeSession(sessionId: string, byUser: string): boolean {
  const target = activeSessionsStore.find((s) => s.sessionId === sessionId);
  if (!target || target.isCurrent) return false;

  activeSessionsStore = activeSessionsStore.filter((s) => s.sessionId !== sessionId);

  recordAuditEvent({
    user: byUser,
    action: 'REVOKE_SESSION',
    resource: `Session ${sessionId} (${target.device})`,
    company: 'ABC GROUP',
    ip: target.ip,
    device: target.device,
    justificationReason: 'Manual session termination from security profile',
    beforeState: {
      sessionId: target.sessionId,
      device: target.device,
      ip: target.ip,
      location: target.location,
      status: 'active'
    },
    afterState: {
      sessionId: target.sessionId,
      revokedBy: byUser,
      revokedAt: new Date().toISOString(),
      status: 'revoked'
    }
  });

  notifySessionListeners();
  return true;
}

export function revokeAllOtherSessions(currentSessionId: string, byUser: string): number {
  const toRevoke = activeSessionsStore.filter((s) => s.sessionId !== currentSessionId && !s.isCurrent);
  const count = toRevoke.length;

  activeSessionsStore = activeSessionsStore.filter((s) => s.sessionId === currentSessionId || s.isCurrent);

  recordAuditEvent({
    user: byUser,
    action: 'REVOKE_ALL_SESSIONS',
    resource: `All Other Sessions (${count} terminated)`,
    company: 'ABC GROUP',
    justificationReason: 'Global session revocation initiated via Step-Up Authentication',
    beforeState: {
      terminatedSessionIds: toRevoke.map((s) => s.sessionId),
      count
    },
    afterState: {
      retainedSessionId: currentSessionId,
      status: 'revoked_all_remote'
    }
  });

  notifySessionListeners();
  return count;
}

// Legacy export for backwards compatibility
export const sessions = activeSessionsStore.map((s) => ({
  device: s.device,
  location: s.location,
  ip: s.ip,
  last: s.lastActive,
  current: s.isCurrent,
}));

export const activity = [
  {
    day: 'Today',
    items: [
      { time: '10:42', text: 'Rahim Ahmed approved Purchase Order PO-2026-9282', tone: 'success' as const },
      { time: '10:31', text: 'Karim Chowdhury updated employment record for Hasan Mahmud', tone: 'info' as const },
      { time: '09:22', text: 'Month-end reconciliation job completed for ABC Foods Ltd.', tone: 'info' as const }
    ]
  },
  {
    day: 'Yesterday',
    items: [
      { time: '16:22', text: 'Group CFO approved payment PAY-2026-1938 (৳1.24 Cr)', tone: 'success' as const },
      { time: '14:11', text: 'Finance Approver role granted to USR-2214', tone: 'warning' as const },
      { time: '11:05', text: 'Supplier Padma Oil Company flagged for payment failure', tone: 'danger' as const }
    ]
  }
];

export const alerts = [
  { title: 'ABC Textiles Ltd. margin below 5% threshold', detail: 'Q3 operating margin 4.0% vs group floor 8.0%', tone: 'danger' as const, meta: 'Finance · 2h ago' },
  { title: 'Payroll approval pending for 3 companies', detail: 'September payroll locks in 4 days', tone: 'warning' as const, meta: 'HR · 6h ago' },
  { title: 'Gazipur Plant II warehouse at 91% capacity', detail: 'Inbound shipments may be rejected', tone: 'warning' as const, meta: 'Inventory · 1d ago' },
  { title: '2 privileged accounts without MFA', detail: 'Group IT policy requires MFA for admin roles', tone: 'danger' as const, meta: 'Security · 1d ago' }
];

export const effectivePermissions = [
  {
    group: 'Finance',
    items: [
      { key: 'invoice.read', granted: true, source: 'Finance Manager' },
      { key: 'invoice.create', granted: true, source: 'Finance Manager' },
      { key: 'invoice.approve', granted: true, source: 'Approval Delegate' },
      { key: 'invoice.delete', granted: false, source: '—' },
      { key: 'payment.release', granted: false, source: 'Requires CFO' }
    ]
  },
  {
    group: 'Procurement',
    items: [
      { key: 'pr.read', granted: true, source: 'Finance Manager' },
      { key: 'pr.approve', granted: true, source: 'Workflow: PR > ৳100k' },
      { key: 'po.create', granted: false, source: '—' }
    ]
  },
  {
    group: 'People',
    items: [
      { key: 'employee.read', granted: true, source: 'Department scope' },
      { key: 'payroll.read', granted: true, source: 'Finance Manager' },
      { key: 'employee.update', granted: false, source: 'HR only' }
    ]
  }
];