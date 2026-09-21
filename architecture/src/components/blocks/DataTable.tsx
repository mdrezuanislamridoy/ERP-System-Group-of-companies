import React from 'react';

interface DataTableProps {
  columns: string[];
  rows: string[][];
  caption?: string;
}

export function DataTable({ columns, rows, caption }: DataTableProps) {
  return (
    <figure className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="doc-scroll overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="bg-rail">
              {columns.map((col) =>
              <th
                key={col}
                scope="col"
                className="whitespace-nowrap border-b border-line px-3.5 py-2 font-semibold uppercase tracking-wide text-2xs text-muted">
                
                  {col}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) =>
            <tr key={i} className="align-top even:bg-rail/60">
                {row.map((cell, j) =>
              <td
                key={j}
                className={
                'border-b border-line px-3.5 py-2 leading-snug ' + (
                j === 0 ? 'font-medium text-ink' : 'text-muted')
                }>
                
                    {cell === '—' ? <span className="text-faint">—</span> : cell}
                  </td>
              )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {caption ?
      <figcaption className="border-t border-line bg-rail px-3.5 py-2 text-2xs text-muted">
          {caption}
        </figcaption> :
      null}
    </figure>);

}