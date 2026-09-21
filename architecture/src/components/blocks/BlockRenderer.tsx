import React from 'react';
import type { Block } from '../../types/doc';
import { CodeBlock } from './CodeBlock';
import { DataTable } from './DataTable';
import { Callout } from './Callout';
import { DecisionCard } from './DecisionCard';
import { TreeView } from './TreeView';
import { FlowChain } from './FlowChain';
import { CardGrid } from './CardGrid';
import { ErdCluster } from './ErdCluster';

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.kind) {
    case 'p':
      return <p className="max-w-prose text-[14.5px] leading-[1.7] text-muted">{block.text}</p>;
    case 'h':
      return (
        <h3 className="border-b border-line pb-1.5 text-[13px] font-semibold uppercase tracking-wide text-ink">
          {block.text}
        </h3>);

    case 'ul':
      return block.ordered ?
      <ol className="max-w-prose list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-muted marker:text-faint">
          {block.items.map((item) =>
        <li key={item}>{item}</li>
        )}
        </ol> :

      <ul className="max-w-prose space-y-1.5 text-[14px] leading-relaxed text-muted">
          {block.items.map((item) =>
        <li key={item} className="relative pl-4 before:absolute before:left-0 before:top-[9px] before:h-1 before:w-1 before:rounded-full before:bg-line-strong">
              {item}
            </li>
        )}
        </ul>;

    case 'code':
      return <CodeBlock title={block.title} code={block.code} />;
    case 'table':
      return <DataTable columns={block.columns} rows={block.rows} caption={block.caption} />;
    case 'decision':
      return (
        <DecisionCard
          title={block.title}
          decision={block.decision}
          why={block.why}
          tradeoffs={block.tradeoffs}
          alternatives={block.alternatives}
          changeWhen={block.changeWhen} />);


    case 'callout':
      return <Callout tone={block.tone} title={block.title} text={block.text} />;
    case 'tree':
      return <TreeView root={block.root} caption={block.caption} />;
    case 'flow':
      return <FlowChain steps={block.steps} caption={block.caption} />;
    case 'cards':
      return <CardGrid items={block.items} />;
    case 'erd':
      return <ErdCluster cluster={block.cluster} entities={block.entities} />;
    default:
      return null;
  }
}