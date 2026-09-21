import React from 'react';
import type { TreeNode } from '../../types/doc';

interface TreeViewProps {
  root: TreeNode;
  caption?: string;
}

function Node({ node, depth }: {node: TreeNode;depth: number;}) {
  const hasChildren = Boolean(node.children && node.children.length);
  return (
    <li className="relative pl-4 before:absolute before:left-0 before:top-[13px] before:h-px before:w-2.5 before:bg-line-strong">
      <div className="flex flex-wrap items-baseline gap-x-2 py-1">
        <span
          className={
          depth === 0 ?
          'text-[13.5px] font-semibold text-ink' :
          'text-[13px] font-medium text-ink'
          }>
          
          {node.label}
        </span>
        {node.note ?
        <span className="font-mono text-2xs text-faint">{node.note}</span> :
        null}
      </div>
      {hasChildren ?
      <ul className="ml-1 border-l border-line-strong">
          {node.children!.map((child) =>
        <Node key={child.label} node={child} depth={depth + 1} />
        )}
        </ul> :
      null}
    </li>);

}

export function TreeView({ root, caption }: TreeViewProps) {
  return (
    <figure className="overflow-hidden rounded-md border border-line bg-surface">
      {caption ?
      <figcaption className="border-b border-line bg-rail px-4 py-2 font-mono text-2xs uppercase tracking-wider text-muted">
          {caption}
        </figcaption> :
      null}
      <div className="doc-scroll overflow-x-auto px-4 py-3">
        <div className="flex items-baseline gap-x-2 pb-1">
          <span className="text-[13.5px] font-semibold uppercase tracking-wide text-ink">
            {root.label}
          </span>
          {root.note ? <span className="font-mono text-2xs text-faint">{root.note}</span> : null}
        </div>
        {root.children ?
        <ul className="ml-1 border-l border-line-strong">
            {root.children.map((child) =>
          <Node key={child.label} node={child} depth={0} />
          )}
          </ul> :
        null}
      </div>
    </figure>);

}