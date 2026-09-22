// ─── Issue #01: Multi-Level Organizational Hierarchy Mock Data ─────────────────
// Full tree: OrgGroup → LegalEntity → BusinessUnit → BranchPlant → Department → CostCenter

import type {
  OrgGroup,
  LegalEntity,
  BusinessUnit,
  BranchPlant,
  Department,
  CostCenter,
  ProfitCenter,
  CostCenterBudgetSnapshot,
} from '../types';

// ─── Legacy alias (keeps existing Company-typed imports working) ───────────────
export { companies } from './org_legacy';

// ─── Legacy `branches` alias used by HR.tsx (old ID shape b-hq, b-plant1, …) ─
// These IDs are keyed in HR.tsx's BRANCH_ATTENDANCE record; keep them as-is.
export const branches = [
  { id: 'b-hq',    name: 'Corporate HQ — Gulshan',          type: 'Head Office', employees: 420,  city: 'Dhaka',      companyId: 'c-foods' },
  { id: 'b-plant1',name: 'Savar Processing Plant',           type: 'Plant',       employees: 980,  city: 'Savar',      companyId: 'c-foods' },
  { id: 'b-plant2',name: 'Gazipur Plant II',                 type: 'Plant',       employees: 520,  city: 'Gazipur',    companyId: 'c-foods' },
  { id: 'b-dc',    name: 'Chattogram Distribution Center',   type: 'Warehouse',   employees: 180,  city: 'Chattogram', companyId: 'c-foods' },
  { id: 'b-sales', name: 'Sylhet Sales Office',              type: 'Sales Office',employees:  40,  city: 'Sylhet',     companyId: 'c-foods' },
];

// ─── Level 0: Group ───────────────────────────────────────────────────────────

export const orgGroup: OrgGroup = {
  id: 'grp-abc',
  name: 'ABC Group',
  legalName: 'ABC Group Holdings PLC',
  currency: 'BDT',
  incorporatedYear: 1994,
  companiesCount: 6,
  countriesCount: 3,
  employeesTotal: 8421,
};

/** Legacy flat object used by header/breadcrumbs already in codebase. */
export const group = {
  id: 'grp-abc',
  name: 'ABC GROUP',
  legal: 'ABC Group Holdings PLC',
  currency: '৳',
  companies: 6,
  countries: 3,
};

// ─── Level 1: Legal Entities (Sister Concerns) ────────────────────────────────

export const legalEntities: LegalEntity[] = [
  {
    id: 'le-foods',
    groupId: 'grp-abc',
    name: 'ABC Foods Ltd.',
    short: 'Foods',
    legalRegNumber: 'RJSC-1998-00412',
    sector: 'Manufacturing',
    country: 'Bangladesh',
    currency: 'BDT',
    employees: 2140,
    revenue: 7420,
    expense: 5510,
    margin: 25.7,
    status: 'active',
    enabledModules: ['finance', 'hr', 'payroll', 'procurement', 'inventory', 'manufacturing', 'quality', 'sales'],
    isSisterConcern: true,
    interCompanyCode: 'IC-FOODS',
  },
  {
    id: 'le-tech',
    groupId: 'grp-abc',
    name: 'ABC Technologies Ltd.',
    short: 'Tech',
    legalRegNumber: 'RJSC-2003-01187',
    sector: 'Software & IT',
    country: 'Bangladesh',
    currency: 'BDT',
    employees: 860,
    revenue: 3180,
    expense: 2240,
    margin: 29.6,
    status: 'active',
    enabledModules: ['finance', 'hr', 'payroll', 'projects', 'crm', 'sales'],
    isSisterConcern: true,
    interCompanyCode: 'IC-TECH',
  },
  {
    id: 'le-transport',
    groupId: 'grp-abc',
    name: 'ABC Transport Ltd.',
    short: 'Transport',
    legalRegNumber: 'RJSC-2001-00839',
    sector: 'Logistics',
    country: 'Bangladesh',
    currency: 'BDT',
    employees: 1490,
    revenue: 4110,
    expense: 3680,
    margin: 10.5,
    status: 'active',
    enabledModules: ['finance', 'hr', 'payroll', 'fleet', 'procurement', 'assets', 'maintenance'],
    isSisterConcern: true,
    interCompanyCode: 'IC-TRANSPORT',
  },
  {
    id: 'le-grocery',
    groupId: 'grp-abc',
    name: 'ABC Grocery Ltd.',
    short: 'Grocery',
    legalRegNumber: 'RJSC-2007-02215',
    sector: 'Retail',
    country: 'Bangladesh',
    currency: 'BDT',
    employees: 2310,
    revenue: 5960,
    expense: 4930,
    margin: 17.3,
    status: 'active',
    enabledModules: ['finance', 'hr', 'payroll', 'inventory', 'sales', 'retail-pos', 'procurement'],
    isSisterConcern: true,
    interCompanyCode: 'IC-GROCERY',
  },
  {
    id: 'le-textile',
    groupId: 'grp-abc',
    name: 'ABC Textiles Ltd.',
    short: 'Textiles',
    legalRegNumber: 'RJSC-2005-01644',
    sector: 'Manufacturing',
    country: 'Bangladesh',
    currency: 'BDT',
    employees: 1120,
    revenue: 2280,
    expense: 2190,
    margin: 4.0,
    status: 'active',
    enabledModules: ['finance', 'hr', 'payroll', 'manufacturing', 'inventory', 'quality', 'procurement'],
    isSisterConcern: true,
    interCompanyCode: 'IC-TEXTILE',
  },
  {
    id: 'le-pharma',
    groupId: 'grp-abc',
    name: 'ABC Pharma Ltd.',
    short: 'Pharma',
    legalRegNumber: 'RJSC-2010-03001',
    sector: 'Healthcare',
    country: 'Bangladesh',
    currency: 'BDT',
    employees: 501,
    revenue: 1550,
    expense: 1250,
    margin: 19.4,
    status: 'active',
    enabledModules: ['finance', 'hr', 'payroll', 'inventory', 'manufacturing', 'quality', 'procurement'],
    isSisterConcern: true,
    interCompanyCode: 'IC-PHARMA',
  },
];

// ─── Level 2: Business Units ──────────────────────────────────────────────────

export const businessUnits: BusinessUnit[] = [
  // ABC Foods
  { id: 'bu-foods-fmcg',   companyId: 'le-foods',     name: 'FMCG Division',          head: 'Mahfuz Anam',     type: 'division', employees: 1400, revenueShare: 68, status: 'active' },
  { id: 'bu-foods-agri',   companyId: 'le-foods',     name: 'Agro Processing',         head: 'Rafiq Islam',     type: 'division', employees: 540,  revenueShare: 22, status: 'active' },
  { id: 'bu-foods-export', companyId: 'le-foods',     name: 'Export Vertical',         head: 'Maliha Haq',      type: 'vertical', employees: 200,  revenueShare: 10, status: 'active' },
  // ABC Tech
  { id: 'bu-tech-saas',    companyId: 'le-tech',      name: 'SaaS Products',           head: 'Farhana Zaman',   type: 'segment',  employees: 520,  revenueShare: 60, status: 'active' },
  { id: 'bu-tech-services',companyId: 'le-tech',      name: 'IT Services & Outsourcing',head: 'Hasan Mahmud',   type: 'segment',  employees: 340,  revenueShare: 40, status: 'active' },
  // ABC Transport
  { id: 'bu-trans-road',   companyId: 'le-transport', name: 'Road Freight',            head: 'Jahangir Alam',   type: 'division', employees: 1100, revenueShare: 74, status: 'active' },
  { id: 'bu-trans-cold',   companyId: 'le-transport', name: 'Cold Chain Logistics',    head: 'Nasim Chowdhury', type: 'division', employees: 390,  revenueShare: 26, status: 'active' },
  // ABC Grocery
  { id: 'bu-groc-retail',  companyId: 'le-grocery',   name: 'Retail Stores',           head: 'Shirin Akter',    type: 'division', employees: 1800, revenueShare: 80, status: 'active' },
  { id: 'bu-groc-online',  companyId: 'le-grocery',   name: 'E-Commerce',              head: 'Taslima Khan',    type: 'vertical', employees: 510,  revenueShare: 20, status: 'active' },
  // ABC Textiles
  { id: 'bu-tex-woven',    companyId: 'le-textile',   name: 'Woven Fabric',            head: 'Anwar Sadiq',     type: 'division', employees: 720,  revenueShare: 65, status: 'active' },
  { id: 'bu-tex-knit',     companyId: 'le-textile',   name: 'Knitwear',                head: 'Dilruba Begum',   type: 'division', employees: 400,  revenueShare: 35, status: 'active' },
  // ABC Pharma
  { id: 'bu-pharma-rx',    companyId: 'le-pharma',    name: 'Prescription Drugs',      head: 'Dr. Sumon Roy',   type: 'division', employees: 310,  revenueShare: 70, status: 'active' },
  { id: 'bu-pharma-otc',   companyId: 'le-pharma',    name: 'OTC & Consumer Health',   head: 'Kamrun Nahar',    type: 'segment',  employees: 191,  revenueShare: 30, status: 'active' },
];

// ─── Level 3: Branch / Plants / Warehouses ────────────────────────────────────

export const branchPlants: BranchPlant[] = [
  // ABC Foods
  { id: 'bp-foods-hq',      companyId: 'le-foods',     businessUnitId: 'bu-foods-fmcg',   name: 'Corporate HQ — Gulshan',          type: 'head-office',  address: 'Plot 5, Road 53, Gulshan-2',   city: 'Dhaka',      employees: 420, status: 'active' },
  { id: 'bp-foods-savar',   companyId: 'le-foods',     businessUnitId: 'bu-foods-fmcg',   name: 'Savar Processing Plant',          type: 'plant',        address: 'BSCIC Industrial Area, Savar', city: 'Savar',      employees: 980, status: 'active' },
  { id: 'bp-foods-gazipur', companyId: 'le-foods',     businessUnitId: 'bu-foods-agri',   name: 'Gazipur Agro Plant II',           type: 'plant',        address: 'Chandona, Gazipur',            city: 'Gazipur',    employees: 520, status: 'active' },
  { id: 'bp-foods-ctg-wh',  companyId: 'le-foods',     businessUnitId: 'bu-foods-fmcg',   name: 'Chattogram Distribution Center',  type: 'warehouse',    address: 'EPZ Road, Nasirabad',          city: 'Chattogram', employees: 180, status: 'active' },
  { id: 'bp-foods-sylhet',  companyId: 'le-foods',     businessUnitId: 'bu-foods-fmcg',   name: 'Sylhet Sales Office',             type: 'sales-office', address: 'Zindabazar, Sylhet',           city: 'Sylhet',     employees:  40, status: 'active' },
  // ABC Tech
  { id: 'bp-tech-hq',       companyId: 'le-tech',      businessUnitId: 'bu-tech-saas',    name: 'Tech Park — Banani',              type: 'head-office',  address: 'House 12, Road 12, Banani',    city: 'Dhaka',      employees: 600, status: 'active' },
  { id: 'bp-tech-ctg',      companyId: 'le-tech',      businessUnitId: 'bu-tech-services','name': 'Chattogram Dev Center',         type: 'branch',       address: 'Agrabad, Chattogram',          city: 'Chattogram', employees: 260, status: 'active' },
  // ABC Transport
  { id: 'bp-trans-hq',      companyId: 'le-transport', businessUnitId: 'bu-trans-road',   name: 'Transport HQ — Tejgaon',          type: 'head-office',  address: 'Tejgaon Industrial Area',      city: 'Dhaka',      employees: 320, status: 'active' },
  { id: 'bp-trans-depot-n', companyId: 'le-transport', businessUnitId: 'bu-trans-road',   name: 'Narsingdi Depot',                 type: 'depot',        address: 'Narsingdi Bypass Road',        city: 'Narsingdi',  employees: 480, status: 'active' },
  { id: 'bp-trans-cold-sav',companyId: 'le-transport', businessUnitId: 'bu-trans-cold',   name: 'Savar Cold Chain Hub',            type: 'warehouse',    address: 'BEPZA, Savar',                 city: 'Savar',      employees: 280, status: 'active' },
  { id: 'bp-trans-ctg',     companyId: 'le-transport', businessUnitId: 'bu-trans-road',   name: 'Chattogram Port Office',          type: 'branch',       address: 'Port Road, Patenga',           city: 'Chattogram', employees: 210, status: 'active' },
  // ABC Grocery
  { id: 'bp-groc-hq',       companyId: 'le-grocery',   businessUnitId: 'bu-groc-retail',  name: 'Retail HQ — Mirpur',              type: 'head-office',  address: 'Mirpur DOHS, Dhaka',           city: 'Dhaka',      employees: 180, status: 'active' },
  { id: 'bp-groc-store-1',  companyId: 'le-grocery',   businessUnitId: 'bu-groc-retail',  name: 'Dhanmondi Flagship Store',        type: 'branch',       address: 'Road 27, Dhanmondi',           city: 'Dhaka',      employees: 120, status: 'active' },
  { id: 'bp-groc-store-2',  companyId: 'le-grocery',   businessUnitId: 'bu-groc-retail',  name: 'Uttara Superstore',               type: 'branch',       address: 'Sector 7, Uttara',             city: 'Dhaka',      employees:  95, status: 'active' },
  { id: 'bp-groc-wh',       companyId: 'le-grocery',   businessUnitId: 'bu-groc-retail',  name: 'Central Grocery Warehouse',       type: 'warehouse',    address: 'Hemayetpur, Dhaka',            city: 'Dhaka',      employees: 140, status: 'active' },
  // ABC Textiles
  { id: 'bp-tex-hq',        companyId: 'le-textile',   businessUnitId: 'bu-tex-woven',    name: 'Textiles HQ — Ashulia',           type: 'head-office',  address: 'Ashulia, Savar',               city: 'Savar',      employees: 150, status: 'active' },
  { id: 'bp-tex-mill-1',    companyId: 'le-textile',   businessUnitId: 'bu-tex-woven',    name: 'Ashulia Weaving Mill',            type: 'plant',        address: 'Ashulia BSCIC',                city: 'Savar',      employees: 570, status: 'active' },
  { id: 'bp-tex-mill-2',    companyId: 'le-textile',   businessUnitId: 'bu-tex-knit',     name: 'Gazipur Knitting Factory',        type: 'plant',        address: 'Kaliakoir, Gazipur',           city: 'Gazipur',    employees: 400, status: 'active' },
  // ABC Pharma
  { id: 'bp-pharma-hq',     companyId: 'le-pharma',    businessUnitId: 'bu-pharma-rx',    name: 'Pharma HQ & R&D Lab — Gulshan',  type: 'head-office',  address: 'CDA Ave, Gulshan-1',           city: 'Dhaka',      employees: 140, status: 'active' },
  { id: 'bp-pharma-plant',  companyId: 'le-pharma',    businessUnitId: 'bu-pharma-rx',    name: 'Tongi GMP Manufacturing Plant',   type: 'plant',        address: 'BSCIC, Tongi, Gazipur',        city: 'Gazipur',    employees: 361, status: 'active' },
];

// ─── Level 4: Departments ─────────────────────────────────────────────────────

export const departments: Department[] = [
  // ABC Foods — Corporate HQ
  { id: 'd-foods-fin',   companyId: 'le-foods', branchId: 'bp-foods-hq',    name: 'Finance & Accounting',   head: 'Nasrin Sultana',  employees: 32,  status: 'active' },
  { id: 'd-foods-hr',    companyId: 'le-foods', branchId: 'bp-foods-hq',    name: 'Human Resources',        head: 'Karim Chowdhury', employees: 18,  status: 'active' },
  { id: 'd-foods-proc',  companyId: 'le-foods', branchId: 'bp-foods-hq',    name: 'Procurement',            head: 'Imran Hossain',   employees: 24,  status: 'active' },
  { id: 'd-foods-sales', companyId: 'le-foods', branchId: 'bp-foods-hq',    name: 'Sales & Distribution',   head: 'Tanvir Rahman',   employees: 210, status: 'active' },
  { id: 'd-foods-it',    companyId: 'le-foods', branchId: 'bp-foods-hq',    name: 'Information Technology', head: 'Hasan Mahmud',    employees: 41,  status: 'active' },
  // ABC Foods — Savar Plant
  { id: 'd-foods-prod',  companyId: 'le-foods', branchId: 'bp-foods-savar', name: 'Production',             head: 'Shahidul Alam',   employees: 640, status: 'active' },
  { id: 'd-foods-qc',    companyId: 'le-foods', branchId: 'bp-foods-savar', name: 'Quality Control',        head: 'Roksana Begum',   employees: 48,  status: 'active' },
  { id: 'd-foods-maint', companyId: 'le-foods', branchId: 'bp-foods-savar', name: 'Plant Maintenance',      head: 'Babul Mia',       employees: 72,  status: 'active' },
  // ABC Tech
  { id: 'd-tech-eng',    companyId: 'le-tech',  branchId: 'bp-tech-hq',     name: 'Engineering',            head: 'Hasan Mahmud',    employees: 410, status: 'active' },
  { id: 'd-tech-design', companyId: 'le-tech',  branchId: 'bp-tech-hq',     name: 'Product & Design',       head: 'Subarna Islam',   employees:  95, status: 'active' },
  { id: 'd-tech-fin',    companyId: 'le-tech',  branchId: 'bp-tech-hq',     name: 'Finance & Admin',        head: 'Rumana Haque',    employees:  22, status: 'active' },
  // ABC Transport
  { id: 'd-trans-fleet', companyId: 'le-transport', branchId: 'bp-trans-hq', name: 'Fleet Operations',      head: 'Sohel Rana',      employees: 890, status: 'active' },
  { id: 'd-trans-fin',   companyId: 'le-transport', branchId: 'bp-trans-hq', name: 'Finance',               head: 'Mizanur Rahman',  employees:  19, status: 'active' },
  // ABC Pharma
  { id: 'd-pharma-qa',   companyId: 'le-pharma', branchId: 'bp-pharma-plant', name: 'Quality Assurance',    head: 'Dr. Rafiqul Alam',employees:  55, status: 'active' },
  { id: 'd-pharma-reg',  companyId: 'le-pharma', branchId: 'bp-pharma-hq',   name: 'Regulatory Affairs',   head: 'Farhana Moni',    employees:  18, status: 'active' },
  { id: 'd-pharma-rd',   companyId: 'le-pharma', branchId: 'bp-pharma-hq',   name: 'Research & Development',head: 'Dr. Sumon Roy',    employees:  42, status: 'active' },
];

// ─── Level 5: Cost Centers ────────────────────────────────────────────────────

export const costCenters: CostCenter[] = [
  // ABC Foods — Finance
  { id: 'cc-foods-fin-001',  companyId: 'le-foods', departmentId: 'd-foods-fin',  branchId: 'bp-foods-hq',    code: 'CC-FOODS-FIN-001',  name: 'Finance — Accounts Payable',         type: 'administrative', manager: 'Rahim Ahmed',      annualBudget: 1200000,  consumedBudget: 780000,  encumberedBudget: 120000,  status: 'active' },
  { id: 'cc-foods-fin-002',  companyId: 'le-foods', departmentId: 'd-foods-fin',  branchId: 'bp-foods-hq',    code: 'CC-FOODS-FIN-002',  name: 'Finance — Accounts Receivable',      type: 'administrative', manager: 'Sabina Yasmin',    annualBudget: 900000,   consumedBudget: 520000,  encumberedBudget: 80000,   status: 'active' },
  { id: 'cc-foods-proc-001', companyId: 'le-foods', departmentId: 'd-foods-proc', branchId: 'bp-foods-hq',    code: 'CC-FOODS-PROC-001', name: 'Procurement — Raw Materials',        type: 'operating',      manager: 'Imran Hossain',    annualBudget: 42000000, consumedBudget: 28000000,encumberedBudget: 6000000, status: 'active' },
  { id: 'cc-foods-prod-001', companyId: 'le-foods', departmentId: 'd-foods-prod', branchId: 'bp-foods-savar', code: 'CC-FOODS-PROD-001', name: 'Production — Rice Milling Line A',   type: 'production',     manager: 'Shahidul Alam',    annualBudget: 18000000, consumedBudget: 11200000,encumberedBudget: 2100000, status: 'active' },
  { id: 'cc-foods-prod-002', companyId: 'le-foods', departmentId: 'd-foods-prod', branchId: 'bp-foods-savar', code: 'CC-FOODS-PROD-002', name: 'Production — Edible Oil Line B',    type: 'production',     manager: 'Liton Mia',        annualBudget: 15000000, consumedBudget: 9800000, encumberedBudget: 1800000, status: 'active' },
  { id: 'cc-foods-qc-001',   companyId: 'le-foods', departmentId: 'd-foods-qc',   branchId: 'bp-foods-savar', code: 'CC-FOODS-QC-001',   name: 'Quality Control — Lab & Testing',   type: 'operating',      manager: 'Roksana Begum',    annualBudget: 3200000,  consumedBudget: 1900000, encumberedBudget: 350000,  status: 'active' },
  // ABC Tech
  { id: 'cc-tech-eng-001',   companyId: 'le-tech',  departmentId: 'd-tech-eng',   branchId: 'bp-tech-hq',     code: 'CC-TECH-ENG-001',   name: 'Engineering — SaaS Platform',       type: 'operating',      manager: 'Hasan Mahmud',     annualBudget: 22000000, consumedBudget: 14500000,encumberedBudget: 3200000, status: 'active' },
  { id: 'cc-tech-eng-002',   companyId: 'le-tech',  departmentId: 'd-tech-eng',   branchId: 'bp-tech-hq',     code: 'CC-TECH-ENG-002',   name: 'Engineering — IT Services',         type: 'operating',      manager: 'Masum Billah',     annualBudget: 12000000, consumedBudget: 7800000, encumberedBudget: 1500000, status: 'active' },
  // ABC Transport
  { id: 'cc-trans-fleet-001',companyId: 'le-transport', departmentId: 'd-trans-fleet', branchId: 'bp-trans-hq', code: 'CC-TRANS-FLEET-001', name: 'Fleet — Road Freight Ops',        type: 'operating',      manager: 'Sohel Rana',       annualBudget: 28000000, consumedBudget: 20000000,encumberedBudget: 4000000, status: 'active' },
  { id: 'cc-trans-fleet-002',companyId: 'le-transport', departmentId: 'd-trans-fleet', branchId: 'bp-trans-cold-sav', code: 'CC-TRANS-FLEET-002', name: 'Fleet — Cold Chain Hub', type: 'operating',      manager: 'Nasim Chowdhury',  annualBudget: 9500000,  consumedBudget: 6200000, encumberedBudget: 1100000, status: 'active' },
  // ABC Pharma
  { id: 'cc-pharma-prod-001',companyId: 'le-pharma', departmentId: 'd-pharma-qa', branchId: 'bp-pharma-plant', code: 'CC-PHARMA-PROD-001', name: 'GMP Manufacturing — Solid Dosage', type: 'production',     manager: 'Dr. Rafiqul Alam', annualBudget: 8500000,  consumedBudget: 5200000, encumberedBudget: 900000,  status: 'active' },
  { id: 'cc-pharma-rd-001',  companyId: 'le-pharma', departmentId: 'd-pharma-rd', branchId: 'bp-pharma-hq',   code: 'CC-PHARMA-RD-001',  name: 'R&D — Drug Discovery',              type: 'operating',      manager: 'Dr. Sumon Roy',    annualBudget: 5000000,  consumedBudget: 2800000, encumberedBudget: 600000,  status: 'active' },
  // ABC Grocery
  { id: 'cc-groc-retail-001',companyId: 'le-grocery', branchId: 'bp-groc-wh',   code: 'CC-GROC-RETAIL-001',name: 'Retail Operations — Store Replenishment', type: 'operating',  manager: 'Shirin Akter',    annualBudget: 6000000,  consumedBudget: 4100000, encumberedBudget: 900000,  status: 'active' },
  { id: 'cc-groc-ecom-001',  companyId: 'le-grocery', branchId: 'bp-groc-hq',   code: 'CC-GROC-ECOM-001',  name: 'E-Commerce — Fulfillment',          type: 'operating',      manager: 'Taslima Khan',     annualBudget: 2500000,  consumedBudget: 1450000, encumberedBudget: 300000,  status: 'active' },
  // ABC Textiles — deliberately tight headroom on the weaving mill for demoing budget overrun
  { id: 'cc-tex-mill-001',   companyId: 'le-textile', branchId: 'bp-tex-mill-1',code: 'CC-TEX-MILL-001',   name: 'Production — Weaving Mill',         type: 'production',     manager: 'Anwar Sadiq',      annualBudget: 9000000,  consumedBudget: 8100000, encumberedBudget: 700000,  status: 'active' },
  { id: 'cc-tex-mill-002',   companyId: 'le-textile', branchId: 'bp-tex-mill-2',code: 'CC-TEX-MILL-002',   name: 'Production — Knitting Factory',     type: 'production',     manager: 'Dilruba Begum',    annualBudget: 7000000,  consumedBudget: 5200000, encumberedBudget: 1200000, status: 'active' },
];

// ─── Issue #07: Cost Center Budget Variance Control Engine ───────────────────
// Encumbrance accounting: submitting a Purchase Request immediately reserves its
// amount against the Cost Center (committed in pending POs) without touching the
// seed consumedBudget figures. Held as a delta overlay so the base seed data
// above stays a readable snapshot of "budget as of period start".

const GROUP_FISCAL_YEAR = 2026;

let runtimeEncumbranceDelta: Record<string, number> = {};
const costCenterBudgetListeners: Array<() => void> = [];

export function subscribeCostCenterBudgets(listener: () => void): () => void {
  costCenterBudgetListeners.push(listener);
  return () => {
    const idx = costCenterBudgetListeners.indexOf(listener);
    if (idx !== -1) costCenterBudgetListeners.splice(idx, 1);
  };
}

/** Reserve (or, with a negative amount, release) budget against a Cost Center. */
export function commitCostCenterEncumbrance(costCenterId: string, amount: number): void {
  runtimeEncumbranceDelta[costCenterId] = (runtimeEncumbranceDelta[costCenterId] || 0) + amount;
  costCenterBudgetListeners.forEach((l) => l());
}

/** Cost centers with encumberedBudget reflecting live, in-flight Purchase Request commitments. */
export function getLiveCostCenters(): CostCenter[] {
  return costCenters.map((cc) => ({
    ...cc,
    encumberedBudget: cc.encumberedBudget + (runtimeEncumbranceDelta[cc.id] || 0)
  }));
}

export function getCostCenterBudget(costCenterId: string): CostCenterBudgetSnapshot | undefined {
  const cc = costCenters.find((c) => c.id === costCenterId);
  if (!cc) return undefined;

  const encumberedAmount = cc.encumberedBudget + (runtimeEncumbranceDelta[cc.id] || 0);
  const availableAmount = cc.annualBudget - (cc.consumedBudget + encumberedAmount);
  const utilizationPct = cc.annualBudget > 0 ? ((cc.consumedBudget + encumberedAmount) / cc.annualBudget) * 100 : 0;

  return {
    costCenterId: cc.id,
    costCenterCode: cc.code,
    costCenterName: cc.name,
    fiscalYear: GROUP_FISCAL_YEAR,
    allocatedAmount: cc.annualBudget,
    consumedAmount: cc.consumedBudget,
    encumberedAmount,
    availableAmount,
    utilizationPct
  };
}

export function getAllCostCenterBudgets(companyId?: string | null): CostCenterBudgetSnapshot[] {
  const scoped = companyId && companyId !== '*' && companyId !== 'all'
    ? costCenters.filter((cc) => cc.companyId === companyId || cc.companyId === companyId.replace(/^c-/, 'le-') || cc.companyId === companyId.replace(/^le-/, 'c-'))
    : costCenters;
  return scoped
    .map((cc) => getCostCenterBudget(cc.id))
    .filter((b): b is CostCenterBudgetSnapshot => Boolean(b));
}

// ─── Level 5: Profit Centers ──────────────────────────────────────────────────

export const profitCenters: ProfitCenter[] = [
  { id: 'pc-foods-fmcg',   companyId: 'le-foods',     businessUnitId: 'bu-foods-fmcg',  code: 'PC-FOODS-FMCG',   name: 'FMCG Revenue Center',       manager: 'Mahfuz Anam',     targetRevenue: 5000000000, actualRevenue: 4850000000, status: 'active' },
  { id: 'pc-foods-agri',   companyId: 'le-foods',     businessUnitId: 'bu-foods-agri',  code: 'PC-FOODS-AGRI',   name: 'Agro Processing Revenue',   manager: 'Rafiq Islam',     targetRevenue: 1800000000, actualRevenue: 1632000000, status: 'active' },
  { id: 'pc-tech-saas',    companyId: 'le-tech',      businessUnitId: 'bu-tech-saas',   code: 'PC-TECH-SAAS',    name: 'SaaS ARR Center',           manager: 'Farhana Zaman',   targetRevenue: 2100000000, actualRevenue: 1908000000, status: 'active' },
  { id: 'pc-trans-road',   companyId: 'le-transport', businessUnitId: 'bu-trans-road',  code: 'PC-TRANS-ROAD',   name: 'Road Freight Revenue',      manager: 'Jahangir Alam',   targetRevenue: 3200000000, actualRevenue: 3041000000, status: 'active' },
  { id: 'pc-groc-stores',  companyId: 'le-grocery',   businessUnitId: 'bu-groc-retail', code: 'PC-GROC-RETAIL',  name: 'Retail Stores Revenue',     manager: 'Shirin Akter',    targetRevenue: 5000000000, actualRevenue: 4768000000, status: 'active' },
  { id: 'pc-pharma-rx',    companyId: 'le-pharma',    businessUnitId: 'bu-pharma-rx',   code: 'PC-PHARMA-RX',    name: 'Rx Drug Revenue',           manager: 'Dr. Sumon Roy',   targetRevenue: 1200000000, actualRevenue: 1085000000, status: 'active' },
];

// ─── OrgNode tree (backward compat — used by OrgChart.tsx) ───────────────────

export interface OrgNode {
  id: string;
  name: string;
  title: string;
  kind: 'group' | 'company' | 'business-unit' | 'branch' | 'department' | 'cost-center' | 'team';
  headcount: number;
  meta?: string; // e.g. sector, city, code
  children?: OrgNode[];
}

export const orgTree: OrgNode = {
  id: 'n-group',
  name: 'Ayesha Karim',
  title: 'Group Chief Executive Officer — ABC Group Holdings',
  kind: 'group',
  headcount: 8421,
  children: [
    {
      id: 'n-foods',
      name: 'Mahfuz Anam',
      title: 'CEO — ABC Foods Ltd.',
      kind: 'company',
      headcount: 2140,
      meta: 'Manufacturing',
      children: [
        {
          id: 'n-foods-fmcg',
          name: 'FMCG Division',
          title: 'Business Unit',
          kind: 'business-unit',
          headcount: 1400,
          children: [
            {
              id: 'n-foods-hq',
              name: 'Corporate HQ — Gulshan',
              title: 'Head Office · Dhaka',
              kind: 'branch',
              headcount: 420,
              children: [
                { id: 'n-foods-fin', name: 'Nasrin Sultana', title: 'Head of Finance & Accounting', kind: 'department', headcount: 32, children: [
                  { id: 'n-cc-foods-fin-001', name: 'CC-FOODS-FIN-001', title: 'Accounts Payable Cost Center', kind: 'cost-center', headcount: 12 },
                  { id: 'n-cc-foods-fin-002', name: 'CC-FOODS-FIN-002', title: 'Accounts Receivable Cost Center', kind: 'cost-center', headcount: 9 },
                ]},
                { id: 'n-foods-proc', name: 'Imran Hossain', title: 'Head of Procurement', kind: 'department', headcount: 24, children: [
                  { id: 'n-cc-foods-proc-001', name: 'CC-FOODS-PROC-001', title: 'Raw Materials Cost Center', kind: 'cost-center', headcount: 24 },
                ]},
                { id: 'n-foods-hr',   name: 'Karim Chowdhury', title: 'Head of Human Resources', kind: 'department', headcount: 18 },
                { id: 'n-foods-sales',name: 'Tanvir Rahman',   title: 'Head of Sales & Distribution', kind: 'department', headcount: 210 },
              ],
            },
            {
              id: 'n-foods-savar',
              name: 'Savar Processing Plant',
              title: 'Plant · Savar',
              kind: 'branch',
              headcount: 980,
              children: [
                { id: 'n-foods-prod', name: 'Shahidul Alam', title: 'Head of Production', kind: 'department', headcount: 640, children: [
                  { id: 'n-cc-prod-001', name: 'CC-FOODS-PROD-001', title: 'Rice Milling Line A', kind: 'cost-center', headcount: 220 },
                  { id: 'n-cc-prod-002', name: 'CC-FOODS-PROD-002', title: 'Edible Oil Line B',  kind: 'cost-center', headcount: 180 },
                ]},
                { id: 'n-foods-qc',   name: 'Roksana Begum',  title: 'Head of Quality Control', kind: 'department', headcount: 48, children: [
                  { id: 'n-cc-qc-001', name: 'CC-FOODS-QC-001', title: 'Lab & Testing Cost Center', kind: 'cost-center', headcount: 48 },
                ]},
                { id: 'n-foods-maint',name: 'Babul Mia',       title: 'Head of Plant Maintenance', kind: 'department', headcount: 72 },
              ],
            },
          ],
        },
        {
          id: 'n-foods-agri',
          name: 'Agro Processing',
          title: 'Business Unit',
          kind: 'business-unit',
          headcount: 540,
          children: [
            { id: 'n-foods-gazipur', name: 'Gazipur Agro Plant II', title: 'Plant · Gazipur', kind: 'branch', headcount: 520 },
          ],
        },
      ],
    },
    {
      id: 'n-tech',
      name: 'Farhana Zaman',
      title: 'Managing Director — ABC Technologies Ltd.',
      kind: 'company',
      headcount: 860,
      meta: 'Software & IT',
      children: [
        {
          id: 'n-tech-saas',
          name: 'SaaS Products',
          title: 'Business Unit',
          kind: 'business-unit',
          headcount: 520,
          children: [
            { id: 'n-tech-hq', name: 'Tech Park — Banani', title: 'Head Office · Dhaka', kind: 'branch', headcount: 600, children: [
              { id: 'n-tech-eng',    name: 'Hasan Mahmud',  title: 'VP Engineering',      kind: 'department', headcount: 410 },
              { id: 'n-tech-design', name: 'Subarna Islam', title: 'Head of Product & Design', kind: 'department', headcount: 95 },
              { id: 'n-tech-fin',    name: 'Rumana Haque',  title: 'Finance Controller',  kind: 'department', headcount: 22 },
            ]},
          ],
        },
      ],
    },
    {
      id: 'n-transport',
      name: 'Jahangir Alam',
      title: 'CEO — ABC Transport Ltd.',
      kind: 'company',
      headcount: 1490,
      meta: 'Logistics',
      children: [
        {
          id: 'n-trans-road',
          name: 'Road Freight',
          title: 'Business Unit',
          kind: 'business-unit',
          headcount: 1100,
          children: [
            { id: 'n-trans-hq', name: 'Transport HQ — Tejgaon', title: 'Head Office · Dhaka', kind: 'branch', headcount: 320, children: [
              { id: 'n-trans-fleet', name: 'Sohel Rana',      title: 'Head of Fleet Operations', kind: 'department', headcount: 890 },
              { id: 'n-trans-fin',   name: 'Mizanur Rahman',  title: 'Finance Manager',           kind: 'department', headcount: 19  },
            ]},
            { id: 'n-trans-depot', name: 'Narsingdi Depot', title: 'Depot · Narsingdi', kind: 'branch', headcount: 480 },
          ],
        },
        {
          id: 'n-trans-cold',
          name: 'Cold Chain Logistics',
          title: 'Business Unit',
          kind: 'business-unit',
          headcount: 390,
          children: [
            { id: 'n-trans-cold-hub', name: 'Savar Cold Chain Hub', title: 'Warehouse · Savar', kind: 'branch', headcount: 280 },
          ],
        },
      ],
    },
    {
      id: 'n-grocery',
      name: 'Shirin Akter',
      title: 'CEO — ABC Grocery Ltd.',
      kind: 'company',
      headcount: 2310,
      meta: 'Retail',
      children: [
        { id: 'n-groc-retail', name: 'Retail Stores', title: 'Business Unit', kind: 'business-unit', headcount: 1800 },
        { id: 'n-groc-online', name: 'E-Commerce',    title: 'Business Unit', kind: 'business-unit', headcount: 510  },
      ],
    },
    {
      id: 'n-textile',
      name: 'Anwar Sadiq',
      title: 'CEO — ABC Textiles Ltd.',
      kind: 'company',
      headcount: 1120,
      meta: 'Manufacturing',
      children: [
        { id: 'n-tex-woven', name: 'Woven Fabric', title: 'Business Unit', kind: 'business-unit', headcount: 720, children: [
          { id: 'n-tex-mill-1', name: 'Ashulia Weaving Mill', title: 'Plant · Savar', kind: 'branch', headcount: 570 },
        ]},
        { id: 'n-tex-knit', name: 'Knitwear', title: 'Business Unit', kind: 'business-unit', headcount: 400, children: [
          { id: 'n-tex-mill-2', name: 'Gazipur Knitting Factory', title: 'Plant · Gazipur', kind: 'branch', headcount: 400 },
        ]},
      ],
    },
    {
      id: 'n-pharma',
      name: 'Dr. Sumon Roy',
      title: 'CEO — ABC Pharma Ltd.',
      kind: 'company',
      headcount: 501,
      meta: 'Healthcare',
      children: [
        { id: 'n-pharma-hq', name: 'Pharma HQ & R&D Lab', title: 'Head Office · Dhaka', kind: 'branch', headcount: 140, children: [
          { id: 'n-pharma-rd',  name: 'Dr. Sumon Roy',   title: 'Head of R&D',             kind: 'department', headcount: 42 },
          { id: 'n-pharma-reg', name: 'Farhana Moni',    title: 'Head of Regulatory Affairs', kind: 'department', headcount: 18 },
        ]},
        { id: 'n-pharma-plant', name: 'Tongi GMP Plant', title: 'Plant · Gazipur', kind: 'branch', headcount: 361, children: [
          { id: 'n-pharma-qa',   name: 'Dr. Rafiqul Alam', title: 'Head of QA',  kind: 'department', headcount: 55, children: [
            { id: 'n-cc-pharma-prod', name: 'CC-PHARMA-PROD-001', title: 'Solid Dosage Cost Center', kind: 'cost-center', headcount: 55 },
          ]},
        ]},
      ],
    },
  ],
};