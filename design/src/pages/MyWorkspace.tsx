import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClockIcon, FileTextIcon, MegaphoneIcon, WalletIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/StatusBadge';
import { useApp } from '../contexts/AppContext';
import { group } from '../data/organization';

const myRequests = [
{ id: 'LV-2026-0412', label: 'Annual Leave · 18–24 Sep', status: 'pending' as const },
{ id: 'EXP-2026-0881', label: 'Travel expense claim · ৳12,400', status: 'approved' as const }];


const announcements = [
{ title: 'September payroll will be disbursed on 28 Sep', meta: 'HR · 2 days ago' },
{ title: 'New expense policy effective 1 Oct 2026', meta: 'Finance · 5 days ago' },
{ title: 'Savar plant safety drill — 25 Sep, 10:00', meta: 'Operations · 1 week ago' }];


export function MyWorkspace() {
  const navigate = useNavigate();
  const { role } = useApp();
  const firstName = role.user.split(' ')[0];

  return (
    <div className="pb-10">
      <PageHeader
        crumbs={[{ label: group.name }, { label: 'ABC Foods Ltd.' }, { label: 'My Workspace' }]}
        title={`Good morning, ${firstName}`}
        description="Wednesday, 21 September 2026"
        meta={<Badge tone="accent">{role.scopeLabel}</Badge>}
        actions={<Button variant="primary">Request leave</Button>} />
      

      <div className="space-y-4 p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className="rounded-lg border border-line bg-subtle p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted">Today's attendance</p>
                <p className="mt-1 font-mono text-3xl font-semibold leading-none text-ink">09:12 AM</p>
                <p className="mt-1.5 text-base text-muted">Checked in · Corporate HQ — Gulshan</p>
              </div>
              <Button variant="danger" icon={ClockIcon}>
                Check out
              </Button>
            </div>
            <div className="mt-5 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
              <div className="pr-3">
                <p className="text-sm text-muted">My tasks</p>
                <p className="font-mono text-xl font-semibold text-ink">5</p>
              </div>
              <div className="px-3">
                <p className="text-sm text-muted">Pending requests</p>
                <p className="font-mono text-xl font-semibold text-ink">2</p>
              </div>
              <div className="pl-3">
                <p className="text-sm text-muted">Leave balance</p>
                <p className="font-mono text-xl font-semibold text-ink">12 d</p>
              </div>
            </div>
          </section>

          <Panel title="September 2026 payslip" description="Net pay credited on 28 Sep 2026" bodyClassName="p-4">
            <dl className="space-y-2">
              {[
              ['Gross salary', '৳118,000'],
              ['Deductions', '−৳14,200'],
              ['Net pay', '৳103,800']].
              map(([k, v], i) =>
              <div key={k} className="flex items-center justify-between border-b border-line/60 pb-2 last:border-b-0 last:pb-0">
                  <dt className={i === 2 ? 'text-base font-medium text-ink' : 'text-base text-muted'}>{k}</dt>
                  <dd className={i === 2 ? 'font-mono tabular text-md font-semibold text-ink' : 'font-mono tabular text-base text-ink'}>
                    {v}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex gap-2">
              <Button icon={WalletIcon}>View payslip</Button>
              <Button variant="ghost" icon={FileTextIcon}>
                Payslip history
              </Button>
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="My tasks" bodyClassName="divide-y divide-line">
            {[
            'Submit August expense report',
            'Complete compliance training module 3',
            'Reconcile vendor ledger — Meghna Packaging',
            'Update emergency contact details',
            'Confirm Q4 leave plan with manager'].
            map((t) =>
            <label key={t} className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 hover:bg-surface">
                <input type="checkbox" className="h-3 w-3 accent-[#3B82F6]" />
                <span className="text-base text-ink">{t}</span>
              </label>
            )}
          </Panel>

          <Panel
            title="My requests"
            actions={<Button variant="ghost" size="xs">New request</Button>}
            bodyClassName="divide-y divide-line">
            
            {myRequests.map((r) =>
            <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base text-ink">{r.label}</p>
                  <p className="font-mono text-sm text-muted">{r.id}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            )}
            <button
              onClick={() => navigate('/hr')}
              className="block w-full px-4 py-2.5 text-left text-base text-accent transition-colors duration-100 ease-out hover:bg-surface">
              
              Open attendance & leave
            </button>
          </Panel>

          <Panel title="Announcements" bodyClassName="divide-y divide-line">
            {announcements.map((a) =>
            <div key={a.title} className="flex gap-2.5 px-4 py-2.5">
                <MegaphoneIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                <div>
                  <p className="text-base text-ink">{a.title}</p>
                  <p className="text-xs text-faint">{a.meta}</p>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>);

}