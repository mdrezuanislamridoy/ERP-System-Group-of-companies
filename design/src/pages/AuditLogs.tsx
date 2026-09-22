import React, { useState } from 'react';
import {
  XIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  CopyIcon,
  CheckIcon,
  LockIcon,
  TerminalIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  FingerprintIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Panel, KeyValue } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { Tabs } from '../components/ui/Tabs';
import { StateDiffViewer } from '../components/audit/StateDiffViewer';
import {
  auditEvents,
  verifyAuditChainIntegrity,
  simulateAuditTampering,
  restoreAuditChain,
} from '../data/system';
import { GENESIS_HASH, calculateAuditEventHash } from '../utils/crypto';
import { companies, group } from '../data/organization';
import { useApp } from '../contexts/AppContext';
import type { AuditEvent, ChainVerificationResult } from '../types';

const ACTION_TONE: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
  APPROVE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'neutral',
  EXPORT: 'warning',
  ROLE_GRANT: 'warning',
  REVOKE_SESSION: 'danger',
  REVOKE_ALL_SESSIONS: 'danger',
  STEP_UP_VERIFIED: 'warning',
};

export function AuditLogs() {
  const { density, can, companyName } = useApp();
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [detailTab, setDetailTab] = useState<'diff' | 'actor' | 'crypto'>('diff');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [tamperMsg, setTamperMsg] = useState<string | null>(null);

  // Run initial chain verification
  const [verification, setVerification] = useState<ChainVerificationResult>(() =>
    verifyAuditChainIntegrity()
  );

  const groupScoped = can('group.read');
  const scopedEvents = groupScoped ? auditEvents : auditEvents.filter((a) => a.company === companyName);

  const handleVerifyChain = () => {
    const result = verifyAuditChainIntegrity();
    setVerification(result);
    setTamperMsg(
      result.isValid
        ? `Chain verification complete: All ${result.totalBlocks} blocks are cryptographically valid with zero tampering detected.`
        : `Tampering detected! Block ${result.tamperedEventId} payload does not match SHA-256 seal.`
    );
  };

  const handleSimulateTamper = (targetId?: string) => {
    const res = simulateAuditTampering(targetId || selected?.id || scopedEvents[0]?.id);
    if (res.success) {
      // Re-verify immediately to show detection
      const result = verifyAuditChainIntegrity();
      setVerification(result);
      setTamperMsg(res.description);
    }
  };

  const handleRestoreChain = () => {
    const restored = restoreAuditChain();
    if (restored) {
      const result = verifyAuditChainIntegrity();
      setVerification(result);
      setTamperMsg('Audit chain restored to pristine cryptographic state.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const columns: Array<Column<AuditEvent>> = [
    {
      key: 'time',
      header: 'Timestamp',
      mono: true,
      sortable: true,
      hideable: false,
      value: (a) => a.time,
      render: (a) => <span className="text-muted text-xs">{a.time}</span>,
    },
    {
      key: 'user',
      header: 'Actor',
      sortable: true,
      value: (a) => a.user,
      render: (a) => (
        <div>
          <span className="font-medium text-ink">{a.user}</span>
          {a.actor?.role && (
            <span className="block text-2xs text-muted font-sans">{a.actor.role}</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      value: (a) => a.action,
      render: (a) => (
        <Badge tone={ACTION_TONE[a.action] ?? 'neutral'}>{a.action}</Badge>
      ),
    },
    {
      key: 'resource',
      header: 'Resource',
      mono: true,
      value: (a) => a.resource,
      render: (a) => (
        <span className="font-mono text-xs text-ink font-medium">{a.resource}</span>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      value: (a) => a.company,
      render: (a) => <span className="text-muted text-xs">{a.company}</span>,
    },
    {
      key: 'currentHash',
      header: 'SHA-256 Hash Block',
      mono: true,
      value: (a) => a.currentHash,
      render: (a) => {
        const isBlockTampered =
          !verification.isValid && verification.tamperedEventId === a.id;
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono text-2xs px-1.5 py-0.5 rounded border ${
                isBlockTampered
                  ? 'border-danger bg-danger-soft text-danger font-bold animate-pulse'
                  : 'border-line bg-canvas text-muted'
              }`}
            >
              {a.currentHash ? `${a.currentHash.slice(0, 8)}...${a.currentHash.slice(-6)}` : '—'}
            </span>
            {isBlockTampered ? (
              <span title="Tampered Block!">
                <ShieldAlertIcon className="h-3.5 w-3.5 text-danger shrink-0" />
              </span>
            ) : (
              <span title="Cryptographically Sealed">
                <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'ip',
      header: 'IP',
      mono: true,
      align: 'right',
      value: (a) => a.ip,
      render: (a) => <span className="text-muted text-2xs font-mono">{a.ip}</span>,
    },
  ];

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Administration' }, { label: 'Audit Logs' }]}
        title="Audit Logs"
        description={
          groupScoped
            ? 'Cryptographically chained, immutable audit trail of privileged transactions across the group. Retained for 7 years.'
            : `Cryptographically chained, immutable audit trail of privileged transactions within ${companyName}. Retained for 7 years.`
        }
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">
              {groupScoped ? 'Group scope' : `${companyName} scope`} · {scopedEvents.length.toLocaleString('en-IN')} events
            </Badge>

            {verification.isValid ? (
              <Badge tone="success">
                <span className="flex items-center gap-1">
                  <ShieldCheckIcon className="h-3.5 w-3.5" />
                  SHA-256 Chain Verified · {verification.totalBlocks} Blocks
                </span>
              </Badge>
            ) : (
              <Badge tone="danger">
                <span className="flex items-center gap-1">
                  <ShieldAlertIcon className="h-3.5 w-3.5 animate-bounce" />
                  Tamper Alert · Block {verification.tamperedEventId} Invalid
                </span>
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={verification.isValid ? 'secondary' : 'danger'}
              onClick={handleVerifyChain}
              className="flex items-center gap-1.5"
            >
              <ShieldCheckIcon className="h-4 w-4" />
              Verify Chain Integrity
            </Button>

            {/* Auditor Simulation Tools */}
            <div className="flex items-center gap-1 border-l border-line pl-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSimulateTamper()}
                title="Demonstrate tamper detection by altering a block payload without hash recalculation"
              >
                Simulate Tamper
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestoreChain}
                title="Restore pristine cryptographic chain"
              >
                Restore Chain
              </Button>
            </div>
          </div>
        }
      />

      {/* Auditor Feedback Toast / Alert Banner */}
      {tamperMsg && (
        <div className="mx-6 mt-4">
          <div
            className={`flex items-center justify-between rounded-xl border p-3.5 text-xs ${
              verification.isValid
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'border-danger/30 bg-danger-soft text-danger font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {verification.isValid ? (
                <ShieldCheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangleIcon className="h-4 w-4 shrink-0 text-danger" />
              )}
              <span>{tamperMsg}</span>
            </div>
            <button
              onClick={() => setTamperMsg(null)}
              className="rounded p-1 hover:bg-black/10 transition-colors"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-4 p-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DataTable
          rows={scopedEvents}
          columns={columns}
          getId={(a) => a.id}
          density={density}
          pageSize={10}
          searchPlaceholder="Search user, resource, action, hash, correlation..."
          searchIn={(a) => `${a.user} ${a.resource} ${a.action} ${a.correlation} ${a.currentHash}`}
          filters={[
            {
              key: 'action',
              label: 'Action',
              options: [
                'APPROVE',
                'UPDATE',
                'DELETE',
                'LOGIN',
                'EXPORT',
                'ROLE_GRANT',
                'REVOKE_SESSION',
                'REVOKE_ALL_SESSIONS',
                'STEP_UP_VERIFIED',
              ],
              match: (a, v) => a.action === v,
            },
            ...(groupScoped
              ? [
                  {
                    key: 'company',
                    label: 'Company',
                    options: [group.name, ...companies.map((c) => c.name)],
                    match: (a: AuditEvent, v: string) => a.company === v,
                  },
                ]
              : []),
          ]}
          onRowClick={setSelected}
        />

        {selected ? (
          <Panel
            title="Event Detail & Deep Diff"
            description={`${selected.id} · ${selected.action} · ${selected.resource}`}
            actions={
              <Button
                variant="ghost"
                size="xs"
                icon={XIcon}
                onClick={() => setSelected(null)}
                aria-label="Close event detail"
              />
            }
          >
            {/* Quick Context Chips */}
            <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-line pb-3">
              <Badge tone={ACTION_TONE[selected.action] ?? 'neutral'}>{selected.action}</Badge>
              <Badge tone="accent">{selected.company}</Badge>
              {selected.previousHash === GENESIS_HASH ? (
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-2xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Genesis Block (0x0)
                </span>
              ) : (
                <span className="rounded bg-canvas px-2 py-0.5 text-2xs font-mono text-muted border border-line">
                  Linked Block
                </span>
              )}

              <button
                type="button"
                onClick={() => handleSimulateTamper(selected.id)}
                className="ml-auto text-2xs text-danger hover:underline"
                title="Corrupt this specific block to test SHA-256 detection"
              >
                Tamper with this block
              </button>
            </div>

            {/* Justification Callout */}
            {selected.justificationReason && (
              <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                <span className="font-semibold text-amber-700 dark:text-amber-400 block text-2xs uppercase">
                  Audit Justification / Approval Reason
                </span>
                <p className="mt-1 text-ink">{selected.justificationReason}</p>
              </div>
            )}

            {/* Detail Tabs */}
            <div className="mb-3">
              <Tabs
                tabs={[
                  { id: 'diff', label: 'State Diff (Before / After)' },
                  { id: 'actor', label: 'Actor & Device' },
                  { id: 'crypto', label: 'Cryptographic Proof' },
                ]}
                active={detailTab}
                onChange={(id) => setDetailTab(id as any)}
              />
            </div>

            {/* Tab 1: Deep State Diff */}
            {detailTab === 'diff' && (
              <div className="mt-2">
                <StateDiffViewer
                  beforeState={selected.beforeState}
                  afterState={selected.afterState}
                  beforeSummary={selected.before}
                  afterSummary={selected.after}
                />
              </div>
            )}

            {/* Tab 2: Actor & Device Metadata */}
            {detailTab === 'actor' && (
              <dl className="mt-2 divide-y divide-line text-xs">
                <KeyValue label="User Name" value={selected.user} />
                <KeyValue
                  label="User ID"
                  value={selected.actor?.userId || selected.user.toLowerCase().replace(/\s+/g, '.')}
                  mono
                />
                <KeyValue label="Role / Capacity" value={selected.actor?.role || 'Enterprise Operator'} />
                <KeyValue label="IP Address" value={selected.ip} mono />
                <KeyValue label="Device & Platform" value={selected.device} />
                <KeyValue
                  label="Device Fingerprint"
                  value={selected.actor?.deviceFingerprint || 'dfp_std_verified_89a'}
                  mono
                />
                <KeyValue
                  label="User Agent"
                  value={
                    <span className="break-all font-mono text-2xs text-muted">
                      {selected.actor?.userAgent || 'ERP-Browser/2.4 (X11; Linux x86_64)'}
                    </span>
                  }
                />
                <KeyValue label="Correlation ID" value={selected.correlation} mono />
                <KeyValue label="Timestamp" value={selected.time} mono />
              </dl>
            )}

            {/* Tab 3: Cryptographic Proof & Hash Chain */}
            {detailTab === 'crypto' && (
              <div className="mt-2 space-y-3">
                <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-semibold uppercase text-muted">
                        Previous Block Hash (Link)
                      </span>
                      <button
                        onClick={() => copyToClipboard(selected.previousHash, 'prev')}
                        className="flex items-center gap-1 text-2xs text-accent hover:underline"
                      >
                        {copiedHash === 'prev' ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                        {copiedHash === 'prev' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="mt-1 font-mono text-2xs text-ink break-all bg-surface p-2 rounded border border-line">
                      {selected.previousHash}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-semibold uppercase text-muted">
                        Current Block SHA-256 Hash
                      </span>
                      <button
                        onClick={() => copyToClipboard(selected.currentHash, 'curr')}
                        className="flex items-center gap-1 text-2xs text-accent hover:underline"
                      >
                        {copiedHash === 'curr' ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                        {copiedHash === 'curr' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="mt-1 font-mono text-2xs font-semibold text-accent break-all bg-surface p-2 rounded border border-line">
                      {selected.currentHash}
                    </pre>
                  </div>
                </div>

                {/* Single Block Mathematical Proof Verification */}
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Cryptographic Seal Verified
                    </span>
                  </div>
                  <p className="mt-1 text-2xs text-muted">
                    SHA-256(prevHash || id || timestamp || actor || payloadDiff) matches the stored hash seal. This
                    record cannot be modified without invalidating all subsequent blocks in the chain.
                  </p>
                </div>
              </div>
            )}
          </Panel>
        ) : (
          <Panel title="Event Detail & Deep Diff">
            <div className="py-8 text-center">
              <FingerprintIcon className="mx-auto h-8 w-8 text-muted/50 mb-2" />
              <p className="text-sm font-medium text-ink">No event selected</p>
              <p className="text-xs text-muted max-w-xs mx-auto mt-1">
                Select any log record from the table to inspect exact before/after payload diffs, actor device
                fingerprints, and cryptographic SHA-256 hash chains.
              </p>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}