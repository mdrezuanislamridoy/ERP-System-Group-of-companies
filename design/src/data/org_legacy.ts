// org_legacy.ts — backward-compat "Company[]" shape used by older pages (Employees, etc.)
// Derived from legalEntities so there is a single source of truth.
// Do NOT add new fields here; use LegalEntity from organization.ts instead.
import type { Company } from '../types';

export const companies: Company[] = [
  { id: 'c-foods',     name: 'ABC Foods Ltd.',         short: 'Foods',     sector: 'Manufacturing',  employees: 2140, revenue: 7420, expense: 5510, margin: 25.7, status: 'active', modules: ['finance', 'hr', 'payroll', 'procurement', 'inventory', 'manufacturing', 'quality', 'sales'] },
  { id: 'c-tech',      name: 'ABC Technologies Ltd.',  short: 'Tech',      sector: 'Software & IT',  employees:  860, revenue: 3180, expense: 2240, margin: 29.6, status: 'active', modules: ['finance', 'hr', 'payroll', 'projects', 'crm', 'sales'] },
  { id: 'c-transport', name: 'ABC Transport Ltd.',     short: 'Transport', sector: 'Logistics',      employees: 1490, revenue: 4110, expense: 3680, margin: 10.5, status: 'active', modules: ['finance', 'hr', 'payroll', 'fleet', 'procurement', 'assets', 'maintenance'] },
  { id: 'c-grocery',   name: 'ABC Grocery Ltd.',       short: 'Grocery',   sector: 'Retail',         employees: 2310, revenue: 5960, expense: 4930, margin: 17.3, status: 'active', modules: ['finance', 'hr', 'payroll', 'inventory', 'sales', 'retail-pos', 'procurement'] },
  { id: 'c-textile',   name: 'ABC Textiles Ltd.',      short: 'Textiles',  sector: 'Manufacturing',  employees: 1120, revenue: 2280, expense: 2190, margin:  4.0, status: 'active', modules: ['finance', 'hr', 'payroll', 'manufacturing', 'inventory', 'quality', 'procurement'] },
  { id: 'c-pharma',    name: 'ABC Pharma Ltd.',        short: 'Pharma',    sector: 'Healthcare',     employees:  501, revenue: 1550, expense: 1250, margin: 19.4, status: 'active', modules: ['finance', 'hr', 'payroll', 'inventory', 'manufacturing', 'quality', 'procurement'] },
];
