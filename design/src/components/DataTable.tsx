import React, { useMemo, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  DownloadIcon,
  SearchIcon,
  SettingsIcon,
  XIcon } from
'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './ui/Button';
import { StateBlock, TableSkeleton } from './ui/States';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  mono?: boolean;
  sticky?: boolean;
  hideable?: boolean;
  value?: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
}

export interface FilterDef<T> {
  key: string;
  label: string;
  options: string[];
  match: (row: T, value: string) => boolean;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Array<Column<T>>;
  getId: (row: T) => string;
  searchPlaceholder?: string;
  searchIn?: (row: T) => string;
  filters?: Array<FilterDef<T>>;
  selectable?: boolean;
  bulkActions?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onCreate?: {label: string;onClick: () => void;};
  density?: 'comfortable' | 'compact';
}

export function DataTable<T>({
  rows,
  columns,
  getId,
  searchPlaceholder = 'Search...',
  searchIn,
  filters = [],
  selectable = false,
  bulkActions,
  toolbarRight,
  onRowClick,
  pageSize = 8,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records matching your current filters.',
  onCreate,
  density = 'comfortable'
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{key: string;dir: 'asc' | 'desc';} | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [hidden, setHidden] = useState<string[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const visibleColumns = columns.filter((c) => !hidden.includes(c.key));
  const hasFilters = Object.values(active).some(Boolean) || query.length > 0;

  const filtered = useMemo(() => {
    let out = rows;
    if (query && searchIn) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchIn(r).toLowerCase().includes(q));
    }
    for (const f of filters) {
      const v = active[f.key];
      if (v) out = out.filter((r) => f.match(r, v));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.value) {
        out = [...out].sort((a, b) => {
          const av = col.value!(a);
          const bv = col.value!(b);
          if (av === bv) return 0;
          const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, active, filters, sort, columns, searchIn]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const cellPad = density === 'compact' ? 'py-1.5' : 'py-2';

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.includes(getId(r)));

  const clearAll = () => {
    setQuery('');
    setActive({});
    setPage(0);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-subtle">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <div className="relative min-w-[200px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-7 w-full rounded border border-line bg-canvas pl-7 pr-2 text-base text-ink placeholder:text-faint focus:border-accent focus:outline-none" />
          
        </div>

        {filters.map((f) =>
        <div key={f.key} className="relative">
            <select
            value={active[f.key] ?? ''}
            onChange={(e) => {
              setActive((prev) => ({ ...prev, [f.key]: e.target.value }));
              setPage(0);
            }}
            aria-label={f.label}
            className={cn(
              'h-7 appearance-none rounded border bg-canvas pl-2 pr-7 text-base focus:border-accent focus:outline-none',
              active[f.key] ? 'border-accent/50 text-ink' : 'border-line text-muted'
            )}>
            
              <option value="">{f.label}</option>
              {f.options.map((o) =>
            <option key={o} value={o}>
                  {o}
                </option>
            )}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-faint" aria-hidden />
          </div>
        )}

        {hasFilters &&
        <Button variant="ghost" size="xs" icon={XIcon} onClick={clearAll}>
            Clear
          </Button>
        }

        <div className="ml-auto flex items-center gap-1.5">
          {toolbarRight}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              icon={SettingsIcon}
              aria-expanded={columnsOpen}
              onClick={() => setColumnsOpen((o) => !o)}>
              
              Columns
            </Button>
            {columnsOpen &&
            <div className="absolute right-0 top-8 z-30 w-52 rounded-lg border border-line bg-surface p-1.5 shadow-pop">
                {columns.map((c) =>
              <label
                key={c.key}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-base text-ink hover:bg-elevated">
                
                    <input
                  type="checkbox"
                  checked={!hidden.includes(c.key)}
                  disabled={c.hideable === false}
                  onChange={() =>
                  setHidden((prev) =>
                  prev.includes(c.key) ? prev.filter((k) => k !== c.key) : [...prev, c.key]
                  )
                  }
                  className="h-3 w-3 accent-[#3B82F6]" />
                
                    {c.header}
                  </label>
              )}
              </div>
            }
          </div>
          <Button variant="secondary" size="sm" icon={DownloadIcon}>
            Export
          </Button>
          {onCreate &&
          <Button variant="primary" size="sm" onClick={onCreate.onClick}>
              {onCreate.label}
            </Button>
          }
        </div>
      </div>

      {selectable && selected.length > 0 &&
      <div className="flex items-center gap-3 border-b border-line bg-accent-soft px-3 py-1.5">
          <span className="text-base font-medium text-ink">{selected.length} selected</span>
          <div className="flex items-center gap-1.5">{bulkActions}</div>
          <button
          onClick={() => setSelected([])}
          className="ml-auto text-sm text-muted transition-colors duration-100 ease-out hover:text-ink">
          
            Clear selection
          </button>
        </div>
      }

      <div className="overflow-x-auto">
        {loading ?
        <TableSkeleton rows={pageSize} /> :
        pageRows.length === 0 ?
        <StateBlock
          variant={hasFilters ? 'no-results' : 'empty'}
          title={hasFilters ? 'No matching records' : emptyTitle}
          description={hasFilters ? 'No records match your current search and filters.' : emptyDescription}
          secondary={hasFilters ? { label: 'Clear filters', onClick: clearAll } : undefined}
          primary={onCreate ? { label: onCreate.label, onClick: onCreate.onClick } : undefined} /> :


        <table className="w-full border-collapse text-base">
            <thead>
              <tr className="border-b border-line bg-subtle">
                {selectable &&
              <th scope="col" className="w-8 px-3 py-2 text-left">
                    <input
                  type="checkbox"
                  aria-label="Select all rows on this page"
                  checked={allOnPageSelected}
                  onChange={() =>
                  setSelected(allOnPageSelected ? [] : pageRows.map(getId))
                  }
                  className="h-3 w-3 accent-[#3B82F6]" />
                
                  </th>
              }
                {visibleColumns.map((c) =>
              <th
                key={c.key}
                scope="col"
                style={{ width: c.width }}
                className={cn(
                  'whitespace-nowrap px-3 py-2 text-sm font-semibold uppercase tracking-wide text-faint',
                  c.align === 'right' ? 'text-right' : 'text-left',
                  c.sticky && 'sticky left-0 z-10 bg-subtle'
                )}>
                
                    {c.sortable ?
                <button
                  onClick={() =>
                  setSort((prev) =>
                  prev?.key === c.key ?
                  { key: c.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } :
                  { key: c.key, dir: 'asc' }
                  )
                  }
                  className={cn(
                    'inline-flex items-center gap-1 transition-colors duration-100 ease-out hover:text-ink',
                    sort?.key === c.key && 'text-ink'
                  )}>
                  
                        {c.header}
                        <ChevronsUpDownIcon className="h-3 w-3" aria-hidden />
                      </button> :

                c.header
                }
                  </th>
              )}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
              const id = getId(row);
              const isSelected = selected.includes(id);
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                  onRowClick ?
                  (e) => {
                    if (e.key === 'Enter') onRowClick(row);
                  } :
                  undefined
                  }
                  className={cn(
                    'border-b border-line/70 transition-colors duration-100 ease-out last:border-b-0',
                    onRowClick && 'cursor-pointer',
                    isSelected ? 'bg-accent-soft' : 'hover:bg-surface'
                  )}>
                  
                    {selectable &&
                  <td className={cn('px-3', cellPad)} onClick={(e) => e.stopPropagation()}>
                        <input
                      type="checkbox"
                      aria-label={`Select ${id}`}
                      checked={isSelected}
                      onChange={() =>
                      setSelected((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                      )
                      }
                      className="h-3 w-3 accent-[#3B82F6]" />
                    
                      </td>
                  }
                    {visibleColumns.map((c) =>
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 align-middle text-ink',
                      cellPad,
                      c.align === 'right' && 'text-right',
                      c.mono && 'font-mono tabular',
                      c.sticky && 'sticky left-0 z-10 bg-inherit'
                    )}>
                    
                        {c.render ? c.render(row) : String(c.value ? c.value(row) : '')}
                      </td>
                  )}
                  </tr>);

            })}
            </tbody>
          </table>
        }
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2 text-sm text-muted">
        <span>
          {filtered.length === 0 ?
          'No records' :
          `${current * pageSize + 1}–${Math.min((current + 1) * pageSize, filtered.length)} of ${filtered.length}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            icon={ChevronLeftIcon}
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label="Previous page" />
          
          <span className="px-1 font-mono tabular text-ink">
            {current + 1} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="xs"
            icon={ChevronRightIcon}
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            aria-label="Next page" />
          
        </div>
      </div>
    </div>);

}