export type Tone = 'info' | 'warn' | 'rule' | 'danger';

export interface TreeNode {
  label: string;
  note?: string;
  children?: TreeNode[];
}

export interface ErdEntity {
  name: string;
  purpose: string;
  pk: string;
  columns: {name: string;type: string;note?: string;}[];
  indexes?: string[];
}

export type Block =
{kind: 'p';text: string;} |
{kind: 'h';text: string;} |
{kind: 'ul';items: string[];ordered?: boolean;} |
{kind: 'code';title?: string;code: string;} |
{kind: 'table';columns: string[];rows: string[][];caption?: string;} |
{
  kind: 'decision';
  title: string;
  decision: string;
  why: string;
  tradeoffs: string;
  alternatives: string;
  changeWhen: string;
} |
{kind: 'callout';tone: Tone;title: string;text: string;} |
{kind: 'tree';caption?: string;root: TreeNode;} |
{kind: 'flow';caption?: string;steps: {label: string;note?: string;}[];} |
{kind: 'cards';items: {title: string;body: string;meta?: string;}[];} |
{kind: 'erd';cluster: string;entities: ErdEntity[];};

export interface DocSection {
  id: string;
  number: number;
  title: string;
  summary: string;
  blocks: Block[];
}

export interface DocGroup {
  label: string;
  sectionIds: string[];
}