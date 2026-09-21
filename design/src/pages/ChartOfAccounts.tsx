import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { chartOfAccounts, formatCurrency } from '../data/finance';
import { group } from '../data/organization';
import { useApp } from '../contexts/AppContext';

export function ChartOfAccounts() {
  const { companyName } = useApp();

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[
        { label: group.name, to: '/' },
        { label: companyName },
        { label: 'Finance', to: '/finance' },
        { label: 'Accounting' },
        { label: 'Chart of Accounts' }]
        }
        title="Chart of Accounts"
        description="Group-standard account hierarchy. Company-specific accounts inherit from the group template."
        meta={<Badge tone="accent">FY2026 · Template v4</Badge>}
        actions={<Button>Export</Button>} />
      

      <div className="p-6">
        <Panel bodyClassName="p-0">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-line">
                {['Code', 'Account', 'Type', 'Balance'].map((h, i) =>
                <th
                  key={h}
                  className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide text-faint ${i === 3 ? 'text-right' : 'text-left'}`}>
                  
                    {h}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {chartOfAccounts.map((a) =>
              <tr key={a.code} className="border-b border-line/70 transition-colors duration-100 ease-out last:border-b-0 hover:bg-surface">
                  <td className="px-4 py-2 font-mono tabular text-muted">{a.code}</td>
                  <td className="px-4 py-2 text-ink" style={{ paddingLeft: 16 + a.level * 20 }}>
                    <span className={a.level === 0 ? 'font-semibold' : ''}>{a.name}</span>
                  </td>
                  <td className="px-4 py-2 text-muted">{a.type}</td>
                  <td className="px-4 py-2 text-right font-mono tabular text-ink">{formatCurrency(a.balance)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>);

}