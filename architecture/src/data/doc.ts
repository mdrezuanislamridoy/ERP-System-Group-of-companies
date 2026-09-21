import type { DocGroup, DocSection } from '../types/doc';
import { foundationSections } from './sections/foundation';
import { accessSections } from './sections/access';
import { domainSections } from './sections/domains';
import { platformSections } from './sections/platform';
import { dataSections } from './sections/data';
import { operationsSections } from './sections/operations';
import { referenceSections } from './sections/reference';
import { deliverySections } from './sections/delivery';

export const sections: DocSection[] = [
...foundationSections,
...accessSections,
...domainSections,
...platformSections,
...dataSections,
...operationsSections,
...referenceSections,
...deliverySections];


export const groups: DocGroup[] = [
{ label: 'Foundation', sectionIds: ['executive-summary', 'business-requirements', 'principles'] },
{ label: 'Organization & Access', sectionIds: ['org-hierarchy', 'iam', 'authz', 'role-hierarchy'] },
{
  label: 'Domain Architecture',
  sectionIds: ['modules', 'finance', 'hr', 'procurement', 'inventory', 'sales']
},
{ label: 'Platform Services', sectionIds: ['workflow', 'audit', 'notifications', 'reporting'] },
{ label: 'Data & Interfaces', sectionIds: ['database', 'erd', 'schema', 'api', 'events', 'security'] },
{ label: 'Operations', sectionIds: ['frontend', 'infrastructure', 'scalability', 'observability', 'backup-dr'] },
{ label: 'Reference', sectionIds: ['scenarios', 'permission-matrix', 'workflow-examples'] },
{ label: 'Delivery', sectionIds: ['roadmap', 'risks', 'final'] }];


export function getSection(id: string): DocSection | undefined {
  return sections.find((s) => s.id === id);
}