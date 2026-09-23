import React, { useEffect, useState } from 'react';
import { XIcon, PlusIcon, Trash2Icon, AlertTriangleIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { createWorkflowRule, updateWorkflowRule } from '../../data/workflow';
import { companies } from '../../data/organization';
import type { WorkflowRule, WorkflowConditionField, WorkflowConditionOperator } from '../../types';

interface WorkflowRuleEditorModalProps {
  isOpen: boolean;
  rule: WorkflowRule | null;
  onClose: () => void;
  onSuccess?: (rule: WorkflowRule) => void;
}

interface ConditionDraft {
  id: string;
  field: WorkflowConditionField;
  operator: WorkflowConditionOperator;
  value: string;
}

interface StageDraft {
  id: string;
  role: string;
  level: string;
  requiredSignatures: string;
}

const ROLE_OPTIONS = ['Department Head', 'Finance Manager', 'Company CFO', 'Group CFO', 'Department Manager', 'Procurement Head'];

function conditionsToDraft(rule: WorkflowRule | null): ConditionDraft[] {
  if (!rule || rule.conditions.length === 0) {
    return [{ id: 'c-1', field: 'amount', operator: '>', value: '' }];
  }
  return rule.conditions.map((c, idx) => ({
    id: `c-${idx}`,
    field: c.field,
    operator: c.operator,
    value: Array.isArray(c.value) ? c.value.join(', ') : String(c.value)
  }));
}

function stagesToDraft(rule: WorkflowRule | null): StageDraft[] {
  if (!rule || rule.approvers.length === 0) {
    return [{ id: 's-1', role: 'Department Head', level: '1', requiredSignatures: '1' }];
  }
  return rule.approvers.map((a, idx) => ({ id: `s-${idx}`, role: a.role, level: String(a.level), requiredSignatures: String(a.requiredSignatures) }));
}

export function WorkflowRuleEditorModal({ isOpen, rule, onClose, onSuccess }: WorkflowRuleEditorModalProps) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [priority, setPriority] = useState(String(rule?.priority ?? 1));
  const [conditions, setConditions] = useState<ConditionDraft[]>(conditionsToDraft(rule));
  const [stages, setStages] = useState<StageDraft[]>(stagesToDraft(rule));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(rule?.name || '');
    setDescription(rule?.description || '');
    setPriority(String(rule?.priority ?? 1));
    setConditions(conditionsToDraft(rule));
    setStages(stagesToDraft(rule));
    setError(null);
  }, [rule, isOpen]);

  if (!isOpen) return null;

  const handleConditionChange = (id: string, patch: Partial<ConditionDraft>) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const addCondition = () => setConditions((prev) => [...prev, { id: `c-${Date.now()}`, field: 'amount', operator: '>', value: '' }]);
  const removeCondition = (id: string) => setConditions((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== id)));

  const handleStageChange = (id: string, patch: Partial<StageDraft>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const addStage = () =>
    setStages((prev) => [...prev, { id: `s-${Date.now()}`, role: 'Finance Manager', level: String(prev.length + 1), requiredSignatures: '1' }]);
  const removeStage = (id: string) => setStages((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));

  const canSubmit =
    name.trim().length > 0 &&
    conditions.every((c) => c.value.trim().length > 0) &&
    stages.every((s) => s.role.trim().length > 0 && parseInt(s.level, 10) > 0 && parseInt(s.requiredSignatures, 10) > 0);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        priority: parseInt(priority, 10) || 0,
        enabled: rule?.enabled ?? true,
        conditions: conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.field === 'amount' ? parseFloat(c.value) || 0 : c.operator === 'in' ? c.value.split(',').map((v) => v.trim()) : c.value.trim()
        })),
        approvers: stages.map((s) => ({ role: s.role.trim(), level: parseInt(s.level, 10) || 1, requiredSignatures: parseInt(s.requiredSignatures, 10) || 1 }))
      };

      const saved = rule ? updateWorkflowRule(rule.id, payload) : createWorkflowRule(payload);
      if (onSuccess) onSuccess(saved);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{rule ? 'Edit Routing Rule' : 'New Routing Rule'}</h2>
            <p className="text-xs text-muted">Conditions are AND-combined; the first enabled rule (by priority) whose conditions all match wins.</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Rule Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
                Priority <span className="text-faint normal-case">(lower runs first)</span>
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this rule for?"
                className="h-8 w-full rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-2xs font-semibold uppercase tracking-wider text-faint">Conditions (all must match)</label>
              <Button type="button" size="xs" variant="secondary" icon={PlusIcon} onClick={addCondition}>
                Add Condition
              </Button>
            </div>
            <div className="space-y-2">
              {conditions.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 rounded-lg border border-line bg-subtle/60 p-2">
                  <select
                    value={c.field}
                    onChange={(e) => handleConditionChange(c.id, { field: e.target.value as WorkflowConditionField, operator: e.target.value === 'amount' ? '>' : '==' })}
                    className="h-8 rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="amount">Amount</option>
                    <option value="company">Company</option>
                    <option value="department">Department</option>
                  </select>
                  <select
                    value={c.operator}
                    onChange={(e) => handleConditionChange(c.id, { operator: e.target.value as WorkflowConditionOperator })}
                    className="h-8 rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                  >
                    {c.field === 'amount' ? (
                      <>
                        <option value=">">greater than</option>
                        <option value="<">less than</option>
                        <option value="==">equals</option>
                      </>
                    ) : (
                      <>
                        <option value="==">is</option>
                        <option value="in">is one of</option>
                      </>
                    )}
                  </select>
                  {c.field === 'company' ? (
                    <select
                      value={c.value}
                      onChange={(e) => handleConditionChange(c.id, { value: e.target.value })}
                      className="h-8 flex-1 rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                    >
                      <option value="">Select company...</option>
                      {companies.map((co) => (
                        <option key={co.id} value={co.name}>{co.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={c.field === 'amount' ? 'number' : 'text'}
                      value={c.value}
                      onChange={(e) => handleConditionChange(c.id, { value: e.target.value })}
                      placeholder={c.field === 'amount' ? '৳' : c.operator === 'in' ? 'Comma-separated values' : 'Value'}
                      required
                      className="h-8 flex-1 rounded border border-line bg-canvas px-2 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeCondition(c.id)}
                    disabled={conditions.length <= 1}
                    className="p-1 rounded text-muted hover:text-danger hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-2xs font-semibold uppercase tracking-wider text-faint">
                Approval Chain <span className="text-faint normal-case">(same level = parallel)</span>
              </label>
              <Button type="button" size="xs" variant="secondary" icon={PlusIcon} onClick={addStage}>
                Add Stage
              </Button>
            </div>
            <div className="space-y-2">
              {stages.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 rounded-lg border border-line bg-subtle/60 p-2">
                  <input
                    list="role-options"
                    value={s.role}
                    onChange={(e) => handleStageChange(s.id, { role: e.target.value })}
                    className="h-8 flex-1 rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-accent focus:outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={s.level}
                    onChange={(e) => handleStageChange(s.id, { level: e.target.value })}
                    title="Sequence level"
                    className="h-8 w-16 rounded border border-line bg-canvas px-2 text-right text-xs text-ink focus:border-accent focus:outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={s.requiredSignatures}
                    onChange={(e) => handleStageChange(s.id, { requiredSignatures: e.target.value })}
                    title="Required signatures"
                    className="h-8 w-16 rounded border border-line bg-canvas px-2 text-right text-xs text-ink focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeStage(s.id)}
                    disabled={stages.length <= 1}
                    className="p-1 rounded text-muted hover:text-danger hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <datalist id="role-options">
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <p className="text-2xs text-muted">Columns: Role · Level (sequence) · Required signatures</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger-soft/30 p-3.5">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 text-danger mt-0.5" />
              <p className="text-xs text-ink">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {rule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
