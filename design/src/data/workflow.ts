import type { WorkflowRule, WorkflowCondition, WorkflowConditionOperator, WorkflowStageGroup, WorkflowEvaluationResult } from '../types';

// ─── Issue #14: Dynamic Conditional Workflow Routing Engine ──────────────────
// Approval chains used to be static (see the old node-canvas in WorkflowBuilder.tsx). This is
// the actual rule engine: a document's payload (amount, company, department...) is evaluated
// against an ordered list of WorkflowRules, and the first fully-matching rule's approver chain
// is returned as the routing path.

// Integer-Taka boundaries expressed with only '>' / '<' (no '<=' in the operator set): tier 1's
// upper bound of "≤ ৳50,000" is written as `< 50001`, tier 2's as `< 500001`, so whole-Taka
// amounts land exactly where the issue's tiers specify.
export const initialWorkflowRules: WorkflowRule[] = [
  {
    id: 'wf-rule-tier1',
    name: 'Tier 1 — Routine spend',
    description: 'Amounts up to ৳50,000 clear with a single Department Head sign-off.',
    conditions: [{ field: 'amount', operator: '<', value: 50001 }],
    approvers: [{ role: 'Department Head', level: 1, requiredSignatures: 1 }],
    priority: 1,
    enabled: true
  },
  {
    id: 'wf-rule-tier2',
    name: 'Tier 2 — Departmental spend',
    description: 'Amounts between ৳50,000 and ৳500,000 need Department Head then Finance Manager sign-off.',
    conditions: [
      { field: 'amount', operator: '>', value: 50000 },
      { field: 'amount', operator: '<', value: 500001 }
    ],
    approvers: [
      { role: 'Department Head', level: 1, requiredSignatures: 1 },
      { role: 'Finance Manager', level: 2, requiredSignatures: 1 }
    ],
    priority: 2,
    enabled: true
  },
  {
    id: 'wf-rule-tier3',
    name: 'Tier 3 — Executive spend',
    description: 'Amounts above ৳500,000 escalate through both company and group CFOs.',
    conditions: [{ field: 'amount', operator: '>', value: 500000 }],
    approvers: [
      { role: 'Department Head', level: 1, requiredSignatures: 1 },
      { role: 'Finance Manager', level: 2, requiredSignatures: 1 },
      { role: 'Company CFO', level: 3, requiredSignatures: 1 },
      { role: 'Group CFO', level: 4, requiredSignatures: 1 }
    ],
    priority: 3,
    enabled: true
  },
  {
    id: 'wf-rule-textiles-dual',
    name: 'ABC Textiles — Dual finance sign-off',
    description: 'Textiles runs thin margins (see FY2026 alerts) — Production spend there always needs two Finance Managers in parallel, regardless of tier.',
    conditions: [
      { field: 'company', operator: '==', value: 'ABC Textiles Ltd.' },
      { field: 'department', operator: '==', value: 'Production' }
    ],
    approvers: [
      { role: 'Department Head', level: 1, requiredSignatures: 1 },
      { role: 'Finance Manager', level: 2, requiredSignatures: 2 }
    ],
    priority: 0,
    enabled: true
  }
];

export let workflowRules: WorkflowRule[] = initialWorkflowRules.map((r) => ({
  ...r,
  conditions: [...r.conditions],
  approvers: [...r.approvers]
}));
const workflowRuleListeners: Array<() => void> = [];

export function getWorkflowRules(): WorkflowRule[] {
  return workflowRules.map((r) => ({ ...r, conditions: [...r.conditions], approvers: [...r.approvers] }));
}

export function subscribeWorkflowRules(listener: () => void): () => void {
  workflowRuleListeners.push(listener);
  return () => {
    const idx = workflowRuleListeners.indexOf(listener);
    if (idx !== -1) workflowRuleListeners.splice(idx, 1);
  };
}

function notifyWorkflowRules(): void {
  workflowRuleListeners.forEach((l) => l());
}

let nextRuleSeq = 1;

export function createWorkflowRule(data: Omit<WorkflowRule, 'id'>): WorkflowRule {
  const rule: WorkflowRule = { ...data, id: `wf-rule-custom-${nextRuleSeq++}` };
  workflowRules = [...workflowRules, rule];
  notifyWorkflowRules();
  return rule;
}

export function updateWorkflowRule(ruleId: string, patch: Partial<Omit<WorkflowRule, 'id'>>): WorkflowRule {
  const rule = workflowRules.find((r) => r.id === ruleId);
  if (!rule) throw new Error('Workflow rule not found.');
  const updated: WorkflowRule = { ...rule, ...patch };
  workflowRules = workflowRules.map((r) => (r.id === ruleId ? updated : r));
  notifyWorkflowRules();
  return updated;
}

export function deleteWorkflowRule(ruleId: string): void {
  workflowRules = workflowRules.filter((r) => r.id !== ruleId);
  notifyWorkflowRules();
}

function evaluateCondition(actual: unknown, operator: WorkflowConditionOperator, expected: WorkflowCondition['value']): boolean {
  switch (operator) {
    case '>':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case '<':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case '==':
      return actual === expected;
    case 'in':
      return Array.isArray(expected) && typeof actual === 'string' && expected.includes(actual);
    default:
      return false;
  }
}

/** Evaluates a document payload (e.g. { amount, company, department }) against enabled rules,
 *  in priority order, and returns the first fully-matching rule's approval chain grouped by
 *  level — a group with more than one stage is a parallel approval step. */
export function evaluateWorkflow(
  payload: Partial<Record<'amount' | 'company' | 'department', number | string>>,
  rules: WorkflowRule[] = workflowRules
): WorkflowEvaluationResult {
  const candidates = [...rules].filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
  const matchedRule = candidates.find((rule) => rule.conditions.every((c) => evaluateCondition(payload[c.field], c.operator, c.value))) || null;

  if (!matchedRule) return { matchedRule: null, stages: [] };

  const byLevel = new Map<number, WorkflowRule['approvers']>();
  for (const approver of matchedRule.approvers) {
    byLevel.set(approver.level, [...(byLevel.get(approver.level) || []), approver]);
  }

  const stages: WorkflowStageGroup[] = [...byLevel.entries()]
    .sort(([a], [b]) => a - b)
    // A level is "parallel" either because more than one distinct approver stage shares it, or
    // because a single stage itself requires multiple signatures (e.g. two Finance Managers).
    .map(([level, approvers]) => ({
      level,
      parallel: approvers.length > 1 || approvers.some((a) => a.requiredSignatures > 1),
      approvers
    }));

  return { matchedRule, stages };
}

export function describeCondition(condition: WorkflowCondition): string {
  const fieldLabel = condition.field === 'amount' ? 'Amount' : condition.field === 'company' ? 'Company' : 'Department';
  const valueLabel =
    condition.field === 'amount' && typeof condition.value === 'number'
      ? `৳${condition.value.toLocaleString('en-IN')}`
      : Array.isArray(condition.value)
      ? condition.value.join(', ')
      : String(condition.value);
  const operatorLabel = condition.operator === '==' ? 'is' : condition.operator === 'in' ? 'is one of' : condition.operator;
  return `${fieldLabel} ${operatorLabel} ${valueLabel}`;
}
