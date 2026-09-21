import React from 'react';

interface CodeBlockProps {
  title?: string;
  code: string;
}

export function CodeBlock({ title, code }: CodeBlockProps) {
  return (
    <figure className="overflow-hidden rounded-md border border-line bg-[#0f151d]">
      {title ?
      <figcaption className="border-b border-white/10 px-4 py-2 font-mono text-2xs uppercase tracking-wider text-white/55">
          {title}
        </figcaption> :
      null}
      <pre className="doc-scroll overflow-x-auto px-4 py-3.5 text-[12.5px] leading-[1.65] text-[#dce3ec]">
        <code className="font-mono">{code}</code>
      </pre>
    </figure>);

}