import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BuildingIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  LayersIcon,
  LocateIcon,
  NetworkIcon,
  SearchIcon,
  UsersIcon,
  WarehouseIcon,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel, KeyValue } from '../components/ui/Panel';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import {
  group,
  orgTree,
  legalEntities,
  branchPlants,
  departments,
  costCenters,
  type OrgNode,
} from '../data/organization';

// ─── Kind metadata ─────────────────────────────────────────────────────────────

type NodeKind = OrgNode['kind'];

const KIND_META: Record<NodeKind, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  group:         { label: 'Group',         icon: NetworkIcon,          color: 'text-accent' },
  company:       { label: 'Legal Entity',  icon: BuildingIcon,         color: 'text-violet-500' },
  'business-unit':{ label: 'Business Unit',icon: LayersIcon,           color: 'text-blue-500'   },
  branch:        { label: 'Branch / Plant',icon: WarehouseIcon,        color: 'text-emerald-500' },
  department:    { label: 'Department',    icon: UsersIcon,            color: 'text-amber-500'  },
  'cost-center': { label: 'Cost Center',   icon: CircleDollarSignIcon, color: 'text-rose-500'   },
  team:          { label: 'Team',          icon: LocateIcon,           color: 'text-faint'      },
};

// ─── Flatten tree for search ──────────────────────────────────────────────────

function flatten(node: OrgNode, acc: OrgNode[] = []): OrgNode[] {
  acc.push(node);
  node.children?.forEach((c) => flatten(c, acc));
  return acc;
}

function getAllIds(node: OrgNode, acc: string[] = []): string[] {
  acc.push(node.id);
  node.children?.forEach((c) => getAllIds(c, acc));
  return acc;
}

// ─── Tree node component ──────────────────────────────────────────────────────

function Node({
  node,
  depth,
  expanded,
  toggle,
  selectedId,
  onSelect,
  matchIds,
  isSearching,
}: {
  node: OrgNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  selectedId: string;
  onSelect: (n: OrgNode) => void;
  matchIds: Set<string>;
  isSearching: boolean;
}) {
  const isOpen = expanded.has(node.id);
  const hasChildren = !!node.children?.length;
  const isMatch = !isSearching || matchIds.has(node.id);
  const { icon: Icon, color, label } = KIND_META[node.kind];

  if (isSearching && !isMatch && !node.children?.some(c => matchIds.has(c.id))) return null;

  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-100',
          selectedId === node.id ? 'bg-accent/10 ring-1 ring-inset ring-accent/30' : 'hover:bg-surface',
          isSearching && !isMatch && 'opacity-40',
        )}
        style={{ marginLeft: depth * 18 }}
      >
        {/* Expand chevron */}
        <button
          type="button"
          onClick={() => hasChildren && toggle(node.id)}
          aria-label={hasChildren ? (isOpen ? 'Collapse' : 'Expand') : undefined}
          className={cn('rounded p-0.5 text-faint', hasChildren ? 'hover:text-ink' : 'invisible')}
        >
          <ChevronRightIcon
            className={cn('h-3.5 w-3.5 transition-transform duration-150', isOpen && 'rotate-90')}
            aria-hidden
          />
        </button>

        {/* Kind icon */}
        <Icon className={cn('h-3.5 w-3.5 shrink-0', color)} aria-hidden />

        {/* Label */}
        <button onClick={() => onSelect(node)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-medium text-ink">{node.name}</span>
            <span className="block truncate text-xs text-muted">{node.title}{node.meta ? ` · ${node.meta}` : ''}</span>
          </span>
          <Badge tone={node.kind === 'group' ? 'accent' : 'neutral'} className="hidden sm:inline-flex">
            {label}
          </Badge>
          <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
            {node.headcount.toLocaleString('en-IN')}
          </span>
        </button>
      </div>

      {hasChildren && isOpen && (
        <ul className="border-l border-line/60" style={{ marginLeft: depth * 18 + 16 }}>
          {node.children!.map((c) => (
            <Node
              key={c.id}
              node={c}
              depth={0}
              expanded={expanded}
              toggle={toggle}
              selectedId={selectedId}
              onSelect={onSelect}
              matchIds={matchIds}
              isSearching={isSearching}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Detail side-panel ────────────────────────────────────────────────────────

function DetailPanel({ node }: { node: OrgNode }) {
  const navigate = useNavigate();
  const { label, icon: Icon, color } = KIND_META[node.kind];

  const legalEntity = legalEntities.find(le => le.id === node.id.replace('n-', 'le-'));
  const branch      = branchPlants.find(bp => bp.id === node.id.replace('n-', 'bp-'));
  const dept        = departments.find(d => d.id === node.id.replace('n-', 'd-'));
  const cc          = costCenters.find(c => c.id === node.id.replace('n-', 'cc-'));

  const budgetUtil = cc
    ? Math.round(((cc.consumedBudget + cc.encumberedBudget) / cc.annualBudget) * 100)
    : null;

  return (
    <Panel
      title={node.name}
      description={label}
      actions={<Icon className={cn('h-4 w-4', color)} aria-hidden />}
    >
      <dl>
        <KeyValue label="Type" value={label} />
        <KeyValue label="Title / Role" value={node.title} />
        <KeyValue label="Headcount" value={node.headcount.toLocaleString('en-IN')} mono />
        <KeyValue label="Direct units" value={String(node.children?.length ?? 0)} mono />
        {node.meta && <KeyValue label="Sector / City" value={node.meta} />}

        {/* Legal entity extras */}
        {legalEntity && (
          <>
            <KeyValue label="Reg. Number" value={legalEntity.legalRegNumber} mono />
            <KeyValue label="Currency" value={legalEntity.currency} />
            <KeyValue
              label="Revenue YTD"
              value={`৳ ${(legalEntity.revenue / 100).toFixed(2)} Cr`}
              mono
            />
            <KeyValue
              label="Net Margin"
              value={
                <span
                  className={cn(
                    'font-mono',
                    legalEntity.margin < 8 ? 'text-danger' : legalEntity.margin < 15 ? 'text-warning' : 'text-success',
                  )}
                >
                  {legalEntity.margin.toFixed(1)}%
                </span>
              }
            />
            <KeyValue label="Status" value={<StatusBadge status={legalEntity.status} />} />
          </>
        )}

        {/* Branch extras */}
        {branch && (
          <>
            <KeyValue label="City" value={branch.city} />
            <KeyValue label="Address" value={branch.address} />
            <KeyValue label="Type" value={branch.type.replace(/-/g, ' ')} />
            <KeyValue label="Status" value={<StatusBadge status={branch.status} />} />
          </>
        )}

        {/* Department extras */}
        {dept && <KeyValue label="Department Head" value={dept.head} />}

        {/* Cost Center extras */}
        {cc && (
          <>
            <KeyValue label="CC Code" value={cc.code} mono />
            <KeyValue label="CC Type" value={cc.type.replace(/-/g, ' ')} />
            <KeyValue label="Manager" value={cc.manager} />
            <KeyValue
              label="Annual Budget"
              value={`৳ ${(cc.annualBudget / 1_000_000).toFixed(2)} M`}
              mono
            />
            <KeyValue
              label="Budget Used (incl. committed)"
              value={
                <span
                  className={cn(
                    'font-mono',
                    (budgetUtil ?? 0) > 90 ? 'text-danger' : (budgetUtil ?? 0) > 70 ? 'text-warning' : 'text-success',
                  )}
                >
                  {budgetUtil}%
                </span>
              }
            />
          </>
        )}
      </dl>

      {/* Enabled modules chips (legal entity) */}
      {legalEntity && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs uppercase tracking-wide text-faint">Enabled modules</p>
          <div className="flex flex-wrap gap-1">
            {legalEntity.enabledModules.map((m) => (
              <Badge key={m}>{m}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button icon={UsersIcon} onClick={() => navigate('/employees')}>
          View employees
        </Button>
        {(node.kind === 'company' || node.kind === 'group') && (
          <Button variant="ghost" onClick={() => navigate('/company')}>
            Open dashboard
          </Button>
        )}
        {node.kind === 'cost-center' && (
          <Button variant="ghost" onClick={() => navigate('/finance')}>
            View GL
          </Button>
        )}
      </div>
    </Panel>
  );
}

// ─── Level legend ─────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 px-6 pb-3">
      {(Object.entries(KIND_META) as [NodeKind, typeof KIND_META[NodeKind]][])
        .filter(([k]) => k !== 'team')
        .map(([kind, { label, icon: Icon, color }]) => (
          <span key={kind} className="flex items-center gap-1.5 text-xs text-muted">
            <Icon className={cn('h-3 w-3', color)} aria-hidden />
            {label}
          </span>
        ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const ALL_IDS = getAllIds(orgTree);
const DEFAULT_EXPANDED = new Set(['n-group', 'n-foods', 'n-foods-fmcg', 'n-foods-hq']);

export function OrgChart() {
  const [expanded, setExpanded] = useState<Set<string>>(DEFAULT_EXPANDED);
  const [selected, setSelected] = useState<OrgNode>(orgTree);
  const [query, setQuery] = useState('');

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const isSearching = query.trim().length > 0;

  const matchIds = useMemo<Set<string>>(() => {
    if (!isSearching) return new Set();
    const q = query.toLowerCase();
    return new Set(
      flatten(orgTree)
        .filter((n) => `${n.name} ${n.title} ${n.meta ?? ''}`.toLowerCase().includes(q))
        .map((n) => n.id),
    );
  }, [query, isSearching]);

  // When searching, auto-expand all so matches are visible
  const effectiveExpanded = isSearching ? new Set(ALL_IDS) : expanded;

  const totalEntities = legalEntities.length;
  const totalHeadcount = orgTree.headcount;

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name, to: '/' }, { label: 'Organization' }, { label: 'Organization Chart' }]}
        title="Organization Chart"
        description="Full 6-level hierarchy: Group → Legal Entity → Business Unit → Branch/Plant → Department → Cost Center."
        meta={
          <Badge tone="accent">
            {totalHeadcount.toLocaleString('en-IN')} people · {totalEntities} legal entities
          </Badge>
        }
        actions={
          <>
            <Button
              onClick={() => setExpanded(new Set(ALL_IDS))}
              size="sm"
            >
              Expand all
            </Button>
            <Button
              onClick={() => setExpanded(new Set(['n-group']))}
              size="sm"
            >
              Collapse all
            </Button>
          </>
        }
      />

      <Legend />

      <div className="grid gap-4 px-6 pb-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Tree panel */}
        <Panel
          title="Reporting & Ownership Structure"
          actions={
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search nodes..."
                aria-label="Search organization chart"
                className="h-7 w-52 rounded border border-line bg-canvas pl-7 pr-2 text-base text-ink placeholder:text-faint focus:border-accent focus:outline-none"
              />
            </div>
          }
          bodyClassName="p-2"
        >
          {isSearching && matchIds.size === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No nodes match "{query}"</p>
          ) : (
            <ul>
              <Node
                node={orgTree}
                depth={0}
                expanded={effectiveExpanded}
                toggle={toggle}
                selectedId={selected.id}
                onSelect={setSelected}
                matchIds={matchIds}
                isSearching={isSearching}
              />
            </ul>
          )}
        </Panel>

        {/* Detail panel */}
        <div className="sticky top-4 self-start">
          <DetailPanel node={selected} />
        </div>
      </div>
    </div>
  );
}