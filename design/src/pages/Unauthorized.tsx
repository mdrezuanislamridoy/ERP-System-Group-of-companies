import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagonIcon, ArrowLeftIcon, FileTextIcon, ShieldAlertIcon, ShieldXIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/StatusBadge';
import { useApp } from '../contexts/AppContext';
import { useEntityScope } from '../contexts/EntityScopeContext';

export interface UnauthorizedProps {
  permission?: string;
  reasonCode?: string;
  attemptedResource?: string;
  entityName?: string;
  entityType?: 'Company' | 'Branch' | 'Department' | 'Financial Limit';
  correlationId?: string;
  message?: string;
}

export function Unauthorized({
  permission,
  reasonCode,
  attemptedResource,
  entityName,
  entityType = 'Company',
  correlationId,
  message,
}: UnauthorizedProps) {
  const navigate = useNavigate();
  const { role, companyName } = useApp();
  const { scope, allowedCompanies } = useEntityScope();

  const isAbacError = Boolean(reasonCode || entityName || attemptedResource);
  const code = reasonCode ?? (permission ? 'ERR_RBAC_PERMISSION_REQUIRED' : 'ERR_ABAC_COMPANY_ISOLATION');

  const defaultMessage = isAbacError
    ? `Your active operating scope is restricted to “${companyName}”. Access to records belonging to “${entityName ?? attemptedResource ?? 'another legal entity'}” is blocked by enterprise data isolation rules.`
    : `Your role (${role.label}) does not include ${permission ? `“${permission}”` : 'the required permission'}. Request access from your Group IT administrator, or switch to a context where you hold this permission.`;

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: 'ABC GROUP', to: '/' }, { label: 'Security Gateway' }, { label: '403 Forbidden' }]}
        title={isAbacError ? 'Cross-Entity Access Prohibited' : 'Permission Required'}
        description="Access to this resource is denied by the Okobiz Security & ABAC Data Isolation Engine."
        meta={
          <Badge tone="danger" className="font-mono">
            403 FORBIDDEN
          </Badge>
        }
        actions={
          <Button icon={ArrowLeftIcon} onClick={() => navigate(-1)}>
            Go back
          </Button>
        }
      />

      <div className="p-6 max-w-4xl">
        <div className="rounded-lg border border-red-500/20 bg-subtle p-6 shadow-sm">
          {/* Main Error Banner */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <ShieldAlertIcon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-ink">
                  {isAbacError ? 'Data Isolation Boundary Triggered' : 'Action Unauthorized'}
                </h3>
                <span className="rounded bg-red-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-red-600 dark:text-red-400">
                  {code}
                </span>
                {correlationId && (
                  <span className="rounded bg-line px-2 py-0.5 font-mono text-2xs text-faint">
                    Audit Ref: {correlationId}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                {message ?? defaultMessage}
              </p>
            </div>
          </div>

          {/* Diagnostic ABAC Scope Details */}
          <div className="mt-6 rounded-md border border-line bg-surface p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-faint mb-3">
              Security Evaluation Context
            </h4>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div>
                <dt className="text-muted">Target Resource / Entity</dt>
                <dd className="mt-0.5 font-medium text-ink flex items-center gap-1.5">
                  <AlertOctagonIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="truncate">{attemptedResource ?? entityName ?? 'Restricted Area'}</span>
                </dd>
              </div>

              <div>
                <dt className="text-muted">Active Authorized Company</dt>
                <dd className="mt-0.5 font-medium text-ink flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                  <span className="truncate">{companyName}</span>
                </dd>
              </div>

              <div>
                <dt className="text-muted">Allowed Legal Entities in Token</dt>
                <dd className="mt-0.5 font-mono text-ink">
                  {scope.allowedCompanyIds.includes('*')
                    ? 'All Group Companies (*)'
                    : allowedCompanies.map((c) => c.name).join(', ') || 'None'}
                </dd>
              </div>

              <div>
                <dt className="text-muted">Financial Authorization Ceiling</dt>
                <dd className="mt-0.5 font-mono text-ink">
                  {scope.financialApprovalLimit === Infinity
                    ? 'Unlimited'
                    : `৳${scope.financialApprovalLimit.toLocaleString('en-IN')}`}
                </dd>
              </div>
            </dl>
          </div>

          {/* Compliance & Audit Policy Banner */}
          <div className="mt-4 rounded-md border border-line/60 bg-surface/50 p-3 text-xs text-muted flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldXIcon className="h-4 w-4 text-faint shrink-0" />
              Event logged in compliance audit trail under Policy SEC-02 (ABAC Scoping).
            </span>
            <button
              onClick={() => navigate('/admin/audit')}
              className="text-accent hover:underline flex items-center gap-1 font-medium"
            >
              <FileTextIcon className="h-3 w-3" />
              Inspect Audit Log
            </button>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => navigate('/')}>
              Return to dashboard
            </Button>
            <Button onClick={() => navigate(-1)}>
              Go back to previous page
            </Button>
            <Button onClick={() => navigate('/profile')}>
              Request cross-entity delegation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}