import React, { useState } from 'react';
import { ColumnsIcon, ListTreeIcon, PlusCircleIcon, MinusCircleIcon, RefreshCwIcon } from 'lucide-react';
import { Badge } from '../ui/StatusBadge';

interface StateDiffViewerProps {
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  beforeSummary?: string;
  afterSummary?: string;
}

type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

interface PropertyDiff {
  key: string;
  type: DiffType;
  beforeVal: any;
  afterVal: any;
}

function formatValue(val: any): string {
  if (val === undefined) return '—';
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

function computeDiffs(
  before: Record<string, any> = {},
  after: Record<string, any> = {}
): PropertyDiff[] {
  const allKeys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})])).sort();
  const diffs: PropertyDiff[] = [];

  for (const key of allKeys) {
    const hasBefore = before && Object.prototype.hasOwnProperty.call(before, key);
    const hasAfter = after && Object.prototype.hasOwnProperty.call(after, key);
    const bVal = hasBefore ? before[key] : undefined;
    const aVal = hasAfter ? after[key] : undefined;

    if (!hasBefore && hasAfter) {
      diffs.push({ key, type: 'added', beforeVal: undefined, afterVal: aVal });
    } else if (hasBefore && !hasAfter) {
      diffs.push({ key, type: 'removed', beforeVal: bVal, afterVal: undefined });
    } else if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      diffs.push({ key, type: 'modified', beforeVal: bVal, afterVal: aVal });
    } else {
      diffs.push({ key, type: 'unchanged', beforeVal: bVal, afterVal: aVal });
    }
  }

  return diffs;
}

export function StateDiffViewer({
  beforeState,
  afterState,
  beforeSummary,
  afterSummary,
}: StateDiffViewerProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [showUnchanged, setShowUnchanged] = useState(false);

  // If no structured object is provided, display raw text summaries
  if (!beforeState && !afterState) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-line bg-canvas p-2.5">
            <span className="text-2xs font-semibold uppercase text-muted">Old value</span>
            <p className="mt-1 font-mono text-ink">{beforeSummary || '—'}</p>
          </div>
          <div className="rounded-lg border border-line bg-canvas p-2.5">
            <span className="text-2xs font-semibold uppercase text-muted">New value</span>
            <p className="mt-1 font-mono text-ink">{afterSummary || '—'}</p>
          </div>
        </div>
      </div>
    );
  }

  const diffs = computeDiffs(beforeState || {}, afterState || {});
  const changedDiffs = diffs.filter((d) => d.type !== 'unchanged');
  const displayedDiffs = showUnchanged ? diffs : changedDiffs;

  const addedCount = diffs.filter((d) => d.type === 'added').length;
  const removedCount = diffs.filter((d) => d.type === 'removed').length;
  const modifiedCount = diffs.filter((d) => d.type === 'modified').length;

  return (
    <div className="space-y-3">
      {/* Diff Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="flex items-center gap-2">
          {addedCount > 0 && (
            <span className="flex items-center gap-1 rounded bg-success-soft border border-success/30 px-1.5 py-0.5 text-2xs font-semibold text-success">
              <PlusCircleIcon className="h-3 w-3" />
              +{addedCount} added
            </span>
          )}
          {modifiedCount > 0 && (
            <span className="flex items-center gap-1 rounded bg-warning-soft border border-warning/30 px-1.5 py-0.5 text-2xs font-semibold text-warning">
              <RefreshCwIcon className="h-3 w-3" />
              {modifiedCount} modified
            </span>
          )}
          {removedCount > 0 && (
            <span className="flex items-center gap-1 rounded bg-danger-soft border border-danger/30 px-1.5 py-0.5 text-2xs font-semibold text-danger">
              <MinusCircleIcon className="h-3 w-3" />
              -{removedCount} removed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-2xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="rounded border-line accent-[#3B82F6]"
            />
            Show all keys
          </label>

          <div className="flex rounded border border-line bg-canvas p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-2xs font-medium transition-colors ${
                viewMode === 'visual' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
              title="Visual Diff Inspector"
            >
              <ListTreeIcon className="h-3 w-3" />
              Visual
            </button>
            <button
              type="button"
              onClick={() => setViewMode('json')}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-2xs font-medium transition-colors ${
                viewMode === 'json' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
              title="Side-by-Side Raw JSON"
            >
              <ColumnsIcon className="h-3 w-3" />
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Visual Mode */}
      {viewMode === 'visual' && (
        <div className="space-y-2">
          {displayedDiffs.length === 0 ? (
            <p className="text-center py-4 text-xs text-muted">No attribute differences detected between states.</p>
          ) : (
            displayedDiffs.map((d) => {
              if (d.type === 'added') {
                return (
                  <div
                    key={d.key}
                    className="rounded-lg border border-success/30 bg-success-soft/20 p-2.5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-success">
                        + {d.key}
                      </span>
                      <span className="rounded bg-success-soft border border-success/30 px-1.5 py-0.2 text-2xs font-medium text-success">
                        Added
                      </span>
                    </div>
                    <pre className="mt-1.5 overflow-x-auto font-mono text-xs text-ink whitespace-pre-wrap">
                      {formatValue(d.afterVal)}
                    </pre>
                  </div>
                );
              }

              if (d.type === 'removed') {
                return (
                  <div
                    key={d.key}
                    className="rounded-lg border border-danger/30 bg-danger-soft/20 p-2.5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-danger line-through">
                        - {d.key}
                      </span>
                      <span className="rounded bg-danger-soft border border-danger/30 px-1.5 py-0.2 text-2xs font-medium text-danger">
                        Removed
                      </span>
                    </div>
                    <pre className="mt-1.5 overflow-x-auto font-mono text-xs text-danger line-through whitespace-pre-wrap">
                      {formatValue(d.beforeVal)}
                    </pre>
                  </div>
                );
              }

              if (d.type === 'modified') {
                return (
                  <div
                    key={d.key}
                    className="rounded-lg border border-warning/30 bg-warning-soft/20 p-2.5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-warning">
                        Δ {d.key}
                      </span>
                      <span className="rounded bg-warning-soft border border-warning/30 px-1.5 py-0.2 text-2xs font-medium text-warning">
                        Modified
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded bg-danger-soft/30 border border-danger/30 p-2">
                        <span className="block text-2xs font-semibold uppercase text-danger">Before</span>
                        <pre className="mt-0.5 overflow-x-auto font-mono text-xs text-danger line-through whitespace-pre-wrap">
                          {formatValue(d.beforeVal)}
                        </pre>
                      </div>
                      <div className="rounded bg-success-soft/30 border border-success/30 p-2">
                        <span className="block text-2xs font-semibold uppercase text-success">After</span>
                        <pre className="mt-0.5 overflow-x-auto font-mono text-xs text-success font-semibold whitespace-pre-wrap">
                          {formatValue(d.afterVal)}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              }

              // Unchanged
              return (
                <div key={d.key} className="rounded-lg border border-line bg-canvas/60 p-2 text-xs opacity-75">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xs font-medium text-muted">{d.key}</span>
                    <span className="text-2xs text-faint">Unchanged</span>
                  </div>
                  <pre className="mt-1 overflow-x-auto font-mono text-2xs text-muted whitespace-pre-wrap">
                    {formatValue(d.afterVal)}
                  </pre>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Side-by-Side Raw JSON Mode */}
      {viewMode === 'json' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-line bg-canvas p-3">
            <div className="flex items-center justify-between border-b border-line pb-1.5 mb-2">
              <span className="text-2xs font-semibold uppercase text-rose-600">Before State JSON</span>
              <span className="text-2xs text-muted font-mono">{Object.keys(beforeState || {}).length} keys</span>
            </div>
            <pre className="overflow-x-auto font-mono text-2xs text-ink max-h-72 leading-relaxed">
              {beforeState ? JSON.stringify(beforeState, null, 2) : 'null'}
            </pre>
          </div>

          <div className="rounded-lg border border-line bg-canvas p-3">
            <div className="flex items-center justify-between border-b border-line pb-1.5 mb-2">
              <span className="text-2xs font-semibold uppercase text-emerald-600">After State JSON</span>
              <span className="text-2xs text-muted font-mono">{Object.keys(afterState || {}).length} keys</span>
            </div>
            <pre className="overflow-x-auto font-mono text-2xs text-ink max-h-72 leading-relaxed">
              {afterState ? JSON.stringify(afterState, null, 2) : 'null'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
