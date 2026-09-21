import React from 'react';
import { InfoIcon, AlertTriangleIcon, ShieldAlertIcon, GavelIcon } from 'lucide-react';
import type { Tone } from '../../types/doc';

interface CalloutProps {
  tone: Tone;
  title: string;
  text: string;
}

const toneMap: Record<Tone, {wrap: string;icon: React.ElementType;label: string;accent: string;}> = {
  info: { wrap: 'border-line bg-rail', icon: InfoIcon, label: 'Note', accent: 'text-accent' },
  warn: { wrap: 'border-warn/25 bg-warn-soft', icon: AlertTriangleIcon, label: 'Caution', accent: 'text-warn' },
  rule: { wrap: 'border-accent/25 bg-accent-soft', icon: GavelIcon, label: 'Rule', accent: 'text-accent' },
  danger: { wrap: 'border-danger/25 bg-danger-soft', icon: ShieldAlertIcon, label: 'Critical', accent: 'text-danger' }
};

export function Callout({ tone, title, text }: CalloutProps) {
  const cfg = toneMap[tone];
  const Icon = cfg.icon;
  return (
    <aside className={'flex gap-3 rounded-md border px-4 py-3.5 ' + cfg.wrap}>
      <Icon className={'mt-0.5 h-4 w-4 shrink-0 ' + cfg.accent} aria-hidden="true" />
      <div>
        <p className="text-[13px] font-semibold text-ink">
          <span className={'mr-2 font-mono text-2xs uppercase tracking-wider ' + cfg.accent}>{cfg.label}</span>
          {title}
        </p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{text}</p>
      </div>
    </aside>);

}