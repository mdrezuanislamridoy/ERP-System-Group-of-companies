import React, { useEffect, useState } from 'react';
import { XIcon, KeyRoundIcon, AlertCircleIcon, CheckCircle2Icon } from 'lucide-react';
import { Button } from '../ui/Button';
import { iamApi } from '../../api/client';

export interface BackendPermission {
  id: string;
  key: string;
  moduleKey: string;
  resource: string;
  action: string;
  isSensitive?: boolean;
}

export interface BackendRole {
  id: string;
  key: string;
  name: string;
  level: string;
  permissions: Array<{ permission: BackendPermission }>;
}

interface EditRolePermissionsModalProps {
  isOpen: boolean;
  role: BackendRole | null;
  allPermissions: BackendPermission[];
  onClose: () => void;
  onSuccess?: (updatedRole: BackendRole) => void;
}

export function EditRolePermissionsModal({ isOpen, role, allPermissions, onClose, onSuccess }: EditRolePermissionsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (role) {
      setSelected(new Set(role.permissions.map((rp) => rp.permission.key)));
      setError(null);
      setSuccessMsg(null);
    }
  }, [role]);

  if (!isOpen || !role) return null;

  const grouped = allPermissions.reduce<Record<string, BackendPermission[]>>((acc, p) => {
    (acc[p.moduleKey] ??= []).push(p);
    return acc;
  }, {});

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    if (!role) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await iamApi.updateRolePermissions(role.id, Array.from(selected));
      setSuccessMsg(`Permissions updated for ${role.name}. Users holding this role must re-authenticate to pick up the change.`);
      if (onSuccess) onSuccess(updated);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Failed to update role permissions. Verify you hold iam.roles.manage and every permission being granted.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-accent-soft text-accent">
              <KeyRoundIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-ink">Edit permissions — {role.name}</h3>
              <p className="text-xs text-muted">
                Replaces this role's full permission set on the server. You can only grant permissions you hold yourself, unless you are a Group Admin.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted transition-colors hover:bg-elevated hover:text-ink">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-md border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-start gap-2.5 rounded-md border border-success/40 bg-success-soft p-3 text-sm text-success">
              <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {Object.entries(grouped).map(([moduleKey, perms]) => (
            <div key={moduleKey}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{moduleKey}</h4>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-start gap-2 rounded border border-line bg-canvas px-2.5 py-2 text-sm hover:bg-elevated cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 accent-[#3B82F6]"
                      checked={selected.has(p.key)}
                      onChange={() => toggle(p.key)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs text-ink">{p.key}</span>
                      <span className="block text-2xs text-faint">
                        {p.resource} · {p.action}
                        {p.isSensitive && ' · sensitive'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="text-xs text-muted">{selected.size} permission(s) selected</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save permissions'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
