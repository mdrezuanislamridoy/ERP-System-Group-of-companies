import { PrismaClient, OrgType, ScopeMode } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Okobiz Enterprise ERP Database Seed...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Clear existing data in reverse order of foreign keys
  await prisma.outboxEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.workflowTask.deleteMany();
  await prisma.workflowInstance.deleteMany();
  await prisma.workflowDefinition.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.purchaseRequest.deleteMany();
  await prisma.party.deleteMany();
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userRoleAssignment.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.person.deleteMany();
  await prisma.companyModule.deleteMany();
  await prisma.organizationClosure.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.numberSequence.deleteMany();

  console.log('✅ Cleared legacy records.');

  // 2. Organization Tree: Group Root
  const group = await prisma.organization.create({
    data: {
      id: 'grp-abc',
      code: 'ABC-GRP',
      name: 'ABC Group Holdings PLC',
      type: OrgType.GROUP,
      currency: 'BDT',
      sector: 'Conglomerate',
      path: 'grp-abc',
      depth: 0,
      employeesCount: 8421,
      revenue: 4850000000,
      expense: 3920000000,
      margin: 19.18,
    },
  });

  // 3. Sister Concerns (Legal Entities)
  const sisterCompanies = [
    {
      id: 'c-foods',
      code: 'OKO-FOODS',
      name: 'Okobiz Foods Ltd',
      sector: 'Consumer Goods & Agro',
      currency: 'BDT',
      revenue: 1650000000,
      expense: 1280000000,
      margin: 22.4,
      employeesCount: 3200,
      modules: ['FINANCE', 'HR', 'PROCUREMENT', 'INVENTORY', 'SALES', 'WORKFLOW'],
    },
    {
      id: 'c-trans',
      code: 'OKO-TRANS',
      name: 'Okobiz Transport Ltd',
      sector: 'Logistics & Fleet',
      currency: 'BDT',
      revenue: 920000000,
      expense: 760000000,
      margin: 17.39,
      employeesCount: 1450,
      modules: ['FINANCE', 'HR', 'PROCUREMENT', 'FLEET', 'WORKFLOW'],
    },
    {
      id: 'c-text',
      code: 'OKO-TEXT',
      name: 'Okobiz Textiles Ltd',
      sector: 'RMG & Apparel',
      currency: 'BDT',
      revenue: 1240000000,
      expense: 1050000000,
      margin: 15.32,
      employeesCount: 2600,
      modules: ['FINANCE', 'HR', 'PROCUREMENT', 'MANUFACTURING', 'INVENTORY', 'WORKFLOW'],
    },
    {
      id: 'c-prop',
      code: 'OKO-PROP',
      name: 'Okobiz Real Estate Ltd',
      sector: 'Property & Infrastructure',
      currency: 'BDT',
      revenue: 680000000,
      expense: 490000000,
      margin: 27.94,
      employeesCount: 380,
      modules: ['FINANCE', 'HR', 'PROCUREMENT', 'PROJECTS', 'WORKFLOW'],
    },
    {
      id: 'c-ret',
      code: 'OKO-RET',
      name: 'Okobiz Retail Ltd',
      sector: 'Retail & Superstores',
      currency: 'BDT',
      revenue: 280000000,
      expense: 260000000,
      margin: 7.14,
      employeesCount: 520,
      modules: ['FINANCE', 'HR', 'INVENTORY', 'POS', 'WORKFLOW'],
    },
    {
      id: 'c-tech',
      code: 'OKO-TECH',
      name: 'Okobiz Tech Services',
      sector: 'Technology & Cloud',
      currency: 'BDT',
      revenue: 80000000,
      expense: 80000000,
      margin: 0.0,
      employeesCount: 271,
      modules: ['FINANCE', 'HR', 'PROJECTS', 'ITSM', 'WORKFLOW'],
    },
  ];

  for (const comp of sisterCompanies) {
    await prisma.organization.create({
      data: {
        id: comp.id,
        parentId: group.id,
        companyId: comp.id,
        code: comp.code,
        name: comp.name,
        type: OrgType.LEGAL_ENTITY,
        currency: comp.currency,
        sector: comp.sector,
        revenue: comp.revenue,
        expense: comp.expense,
        margin: comp.margin,
        employeesCount: comp.employeesCount,
        path: `${group.id}.${comp.id}`,
        depth: 1,
      },
    });

    // Modules activation
    for (const mod of comp.modules) {
      await prisma.companyModule.create({
        data: {
          companyId: comp.id,
          moduleKey: mod,
          status: 'ACTIVE',
        },
      });
    }

    // Number sequences per company
    for (const docType of ['JOURNAL', 'INVOICE', 'PO', 'PR']) {
      await prisma.numberSequence.create({
        data: {
          companyId: comp.id,
          documentType: docType,
          fiscalYear: 2026,
          prefix: `${docType}-${comp.code.replace('OKO-', '')}`,
          nextValue: BigInt(1),
          padding: 6,
        },
      });
    }
  }

  // 4. Detailed Branches / Plants for Okobiz Foods
  const foodsBranches = [
    { id: 'bp-foods-hq', code: 'FOODS-HQ', name: 'Corporate HQ — Gulshan', type: OrgType.BRANCH_PLANT },
    { id: 'bp-savar', code: 'PLANT-SAVAR', name: 'Savar Processing Plant', type: OrgType.FACTORY },
    { id: 'bp-gazipur', code: 'PLANT-GAZIPUR', name: 'Gazipur Plant II', type: OrgType.FACTORY },
    { id: 'bp-ctg-dc', code: 'DC-CTG', name: 'Chattogram Distribution Center', type: OrgType.WAREHOUSE },
  ];

  for (const br of foodsBranches) {
    await prisma.organization.create({
      data: {
        id: br.id,
        parentId: 'c-foods',
        companyId: 'c-foods',
        code: br.code,
        name: br.name,
        type: br.type,
        path: `grp-abc.c-foods.${br.id}`,
        depth: 2,
      },
    });
  }

  // Departments under Foods HQ
  const foodsDepartments = [
    { id: 'dept-fin-foods', code: 'DEPT-FIN', name: 'Finance & Accounts', parentId: 'bp-foods-hq' },
    { id: 'dept-proc-foods', code: 'DEPT-PROC', name: 'Procurement & Supply', parentId: 'bp-foods-hq' },
    { id: 'dept-hr-foods', code: 'DEPT-HR', name: 'Human Resources', parentId: 'bp-foods-hq' },
  ];

  for (const dept of foodsDepartments) {
    await prisma.organization.create({
      data: {
        id: dept.id,
        parentId: dept.parentId,
        companyId: 'c-foods',
        code: dept.code,
        name: dept.name,
        type: OrgType.DEPARTMENT,
        path: `grp-abc.c-foods.${dept.parentId}.${dept.id}`,
        depth: 3,
      },
    });
  }

  // 5. Pre-expand Organization Closure Table
  const allOrgs = await prisma.organization.findMany();
  for (const org of allOrgs) {
    const parts = org.path.split('.');
    for (let i = 0; i < parts.length; i++) {
      const ancestorId = parts[i];
      const depth = parts.length - 1 - i;
      await prisma.organizationClosure.create({
        data: {
          ancestorId,
          descendantId: org.id,
          depth,
        },
      });
    }
  }

  console.log('✅ Created organization hierarchy and precomputed closure table.');

  // 6. Permissions and Roles
  const permissions = [
    { key: 'org.read', moduleKey: 'CORE', resource: 'organization', action: 'read' },
    { key: 'org.write', moduleKey: 'CORE', resource: 'organization', action: 'write' },
    { key: 'finance.gl.read', moduleKey: 'FINANCE', resource: 'journal', action: 'read' },
    { key: 'finance.gl.post', moduleKey: 'FINANCE', resource: 'journal', action: 'post' },
    { key: 'finance.approval.level1', moduleKey: 'FINANCE', resource: 'invoice', action: 'approve' },
    { key: 'procurement.pr.create', moduleKey: 'PROCUREMENT', resource: 'purchase_request', action: 'create' },
    { key: 'procurement.pr.approve', moduleKey: 'PROCUREMENT', resource: 'purchase_request', action: 'approve' },
    { key: 'procurement.po.create', moduleKey: 'PROCUREMENT', resource: 'purchase_order', action: 'create' },
    { key: 'inventory.stock.read', moduleKey: 'INVENTORY', resource: 'stock', action: 'read' },
    { key: 'inventory.stock.move', moduleKey: 'INVENTORY', resource: 'stock', action: 'move' },
    { key: 'iam.user.create', moduleKey: 'IAM', resource: 'user', action: 'create' },
    { key: 'audit.logs.read', moduleKey: 'GOVERNANCE', resource: 'audit_log', action: 'read' },
    { key: 'sensitive.salary.read', moduleKey: 'HR', resource: 'salary', action: 'read', isSensitive: true },
  ];

  for (const p of permissions) {
    await prisma.permission.create({ data: p });
  }

  const roleDefinitions = [
    {
      key: 'group-ceo',
      name: 'Group Chief Executive Officer',
      level: 'GROUP',
      isSystem: true,
      attributes: { financialApprovalLimit: 999999999 },
      perms: permissions.map((p) => p.key),
    },
    {
      key: 'group-cfo',
      name: 'Group Chief Financial Officer',
      level: 'GROUP',
      isSystem: true,
      attributes: { financialApprovalLimit: 50000000 },
      perms: ['org.read', 'finance.gl.read', 'finance.gl.post', 'finance.approval.level1', 'audit.logs.read', 'sensitive.salary.read'],
    },
    {
      key: 'company-cfo',
      name: 'Company Finance Director',
      level: 'COMPANY',
      isSystem: true,
      attributes: { financialApprovalLimit: 2500000 },
      perms: ['org.read', 'finance.gl.read', 'finance.gl.post', 'finance.approval.level1', 'procurement.pr.approve'],
    },
    {
      key: 'procurement-officer',
      name: 'Senior Procurement Officer',
      level: 'COMPANY',
      isSystem: true,
      attributes: { financialApprovalLimit: 500000 },
      perms: ['org.read', 'procurement.pr.create', 'procurement.pr.approve', 'procurement.po.create', 'inventory.stock.read'],
    },
    {
      key: 'auditor',
      name: 'Internal Audit Lead',
      level: 'GROUP',
      isSystem: true,
      attributes: { readOnly: true },
      perms: ['org.read', 'finance.gl.read', 'inventory.stock.read', 'audit.logs.read'],
    },
  ];

  for (const r of roleDefinitions) {
    const role = await prisma.role.create({
      data: {
        key: r.key,
        name: r.name,
        level: r.level,
        isSystem: r.isSystem,
        attributes: r.attributes,
      },
    });

    for (const pk of r.perms) {
      const perm = await prisma.permission.findUnique({ where: { key: pk } });
      if (perm) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: perm.id,
            effect: 'ALLOW',
          },
        });
      }
    }
  }

  // 7. Seed Directory Users matching Frontend Mock Directory
  const demoUsers = [
    {
      employeeId: 'EMP-10001',
      email: 'ceo@abc-group.com',
      firstName: 'Syed',
      lastName: 'Rezuan Islam',
      roleKey: 'group-ceo',
      orgId: 'grp-abc',
      companyId: null,
      scopeMode: ScopeMode.SUBTREE,
      title: 'Group Chief Executive Officer',
      baseSalary: 450000,
    },
    {
      employeeId: 'EMP-10002',
      email: 'admin@abc-group.com',
      firstName: 'Faisal',
      lastName: 'Ahmed',
      roleKey: 'group-super-admin',
      orgId: 'grp-abc',
      companyId: null,
      scopeMode: ScopeMode.SUBTREE,
      title: 'Group IT Super Administrator',
      baseSalary: 280000,
    },
    {
      employeeId: 'EMP-10003',
      email: 'cfo@abc-group.com',
      firstName: 'Farhana',
      lastName: 'Ahmed',
      roleKey: 'group-cfo',
      orgId: 'grp-abc',
      companyId: null,
      scopeMode: ScopeMode.SUBTREE,
      title: 'Group Chief Financial Officer',
      baseSalary: 380000,
    },
    {
      employeeId: 'EMP-20001',
      email: 'cfo@okobiz-foods.com',
      firstName: 'Kamal',
      lastName: 'Hossain',
      roleKey: 'company-cfo',
      orgId: 'c-foods',
      companyId: 'c-foods',
      scopeMode: ScopeMode.SUBTREE,
      title: 'Chief Financial Officer — Foods',
      baseSalary: 220000,
    },
    {
      employeeId: 'EMP-20002',
      email: 'procurement@okobiz-foods.com',
      firstName: 'Nasir',
      lastName: 'Uddin',
      roleKey: 'procurement-officer',
      orgId: 'dept-proc-foods',
      companyId: 'c-foods',
      scopeMode: ScopeMode.NODE,
      title: 'Senior Procurement Officer',
      baseSalary: 110000,
    },
  ];

  for (const u of demoUsers) {
    const person = await prisma.person.create({
      data: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        employeeNo: u.employeeId,
        phone: '+880-1711-000000',
        baseSalary: u.baseSalary,
        bankAccount: '102-120-998822',
        bankName: 'Eastern Bank PLC',
      },
    });

    const user = await prisma.user.create({
      data: {
        personId: person.id,
        employeeId: u.employeeId,
        email: u.email,
        passwordHash,
        status: 'ACTIVE',
      },
    });

    const role = await prisma.role.findUnique({ where: { key: u.roleKey } });
    if (role) {
      await prisma.userRoleAssignment.create({
        data: {
          userId: user.id,
          roleId: role.id,
          organizationId: u.orgId,
          companyId: u.companyId,
          scopeMode: u.scopeMode,
          title: u.title,
        },
      });
    }
  }

  // 8. Standard Chart of Accounts (Global Master & Foods Local)
  const coa = [
    { code: '1000', name: 'Assets', level: 1, type: 'ASSET', normal: 'DEBIT' },
    { code: '1100', name: 'Current Assets', level: 2, type: 'ASSET', normal: 'DEBIT', parent: '1000' },
    { code: '1110', name: 'Cash and Cash Equivalents', level: 3, type: 'ASSET', normal: 'DEBIT', parent: '1100', opening: 45000000 },
    { code: '1120', name: 'Accounts Receivable', level: 3, type: 'ASSET', normal: 'DEBIT', parent: '1100', opening: 82000000 },
    { code: '1130', name: 'Inventory - Raw Materials', level: 3, type: 'ASSET', normal: 'DEBIT', parent: '1100', opening: 34000000 },
    { code: '1200', name: 'Non-Current Assets', level: 2, type: 'ASSET', normal: 'DEBIT', parent: '1000' },
    { code: '1210', name: 'Plant, Property & Equipment', level: 3, type: 'ASSET', normal: 'DEBIT', parent: '1200', opening: 210000000 },
    { code: '2000', name: 'Liabilities', level: 1, type: 'LIABILITY', normal: 'CREDIT' },
    { code: '2100', name: 'Current Liabilities', level: 2, type: 'LIABILITY', normal: 'CREDIT', parent: '2000' },
    { code: '2110', name: 'Accounts Payable', level: 3, type: 'LIABILITY', normal: 'CREDIT', parent: '2100', opening: 48000000 },
    { code: '3000', name: 'Equity', level: 1, type: 'EQUITY', normal: 'CREDIT' },
    { code: '3100', name: 'Share Capital', level: 2, type: 'EQUITY', normal: 'CREDIT', parent: '3000', opening: 150000000 },
    { code: '3200', name: 'Retained Earnings', level: 2, type: 'EQUITY', normal: 'CREDIT', parent: '3000', opening: 173000000 },
    { code: '4000', name: 'Revenue', level: 1, type: 'REVENUE', normal: 'CREDIT' },
    { code: '4100', name: 'Operating Sales Revenue', level: 2, type: 'REVENUE', normal: 'CREDIT', parent: '4000', opening: 0 },
    { code: '5000', name: 'Expenses', level: 1, type: 'EXPENSE', normal: 'DEBIT' },
    { code: '5100', name: 'Cost of Goods Sold (COGS)', level: 2, type: 'EXPENSE', normal: 'DEBIT', parent: '5000', opening: 0 },
    { code: '5200', name: 'Administrative & Operating Expenses', level: 2, type: 'EXPENSE', normal: 'DEBIT', parent: '5000', opening: 0 },
  ];

  for (const acc of coa) {
    await prisma.account.create({
      data: {
        code: acc.code,
        name: acc.name,
        level: acc.level,
        type: acc.type,
        normalBalance: acc.normal,
        parentCode: acc.parent,
        openingBalance: acc.opening || 0,
        currentBalance: acc.opening || 0,
        companyId: 'c-foods',
      },
    });
  }

  // 9. Initial Suppliers & Stock Items
  const supplier = await prisma.party.create({
    data: {
      type: 'SUPPLIER',
      code: 'SUP-BENGAL-AGRO',
      legalName: 'Bengal Agro Commodities Ltd',
      taxId: 'TIN-994821009',
      status: 'ACTIVE',
    },
  });

  await prisma.stockItem.create({
    data: {
      companyId: 'c-foods',
      warehouseId: 'bp-ctg-dc',
      sku: 'SKU-WHEAT-50KG',
      product: 'Grade-A Premium Wheat (50kg Bag)',
      available: 2400,
      reserved: 200,
      incoming: 1000,
      reorderPoint: 500,
      unitCost: 1850,
      totalValue: 4440000,
      status: 'ACTIVE',
    },
  });

  // 10. Sample Purchase Request with Workflow
  const pr = await prisma.purchaseRequest.create({
    data: {
      number: 'PR-FOODS-2026-000001',
      companyId: 'c-foods',
      departmentId: 'dept-proc-foods',
      title: 'Bulk Wheat Grain Procurement - 1000 Bags',
      amount: 1850000,
      priority: 'HIGH',
      stage: 'FINANCIAL_REVIEW',
      status: 'PENDING',
    },
  });

  const wfDef = await prisma.workflowDefinition.create({
    data: {
      companyId: 'c-foods',
      documentType: 'PURCHASE_REQUEST',
      name: 'High Value PR 2-Stage Approval',
      status: 'PUBLISHED',
    },
  });

  const wfInst = await prisma.workflowInstance.create({
    data: {
      definitionId: wfDef.id,
      companyId: 'c-foods',
      documentType: 'PURCHASE_REQUEST',
      documentId: pr.id,
      status: 'IN_PROGRESS',
    },
  });

  const cfoUser = await prisma.user.findUnique({ where: { email: 'cfo@okobiz-foods.com' } });
  if (cfoUser) {
    await prisma.workflowTask.create({
      data: {
        instanceId: wfInst.id,
        stepNumber: 1,
        stepName: 'CFO Financial Review',
        assigneeUserId: cfoUser.id,
        status: 'PENDING',
        dueAt: new Date(Date.now() + 86400000 * 2), // 48h
      },
    });
  }

  // 11. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_BOOTSTRAP',
      resource: 'organization',
      resourceId: group.id,
      newValue: { description: 'Initialized Okobiz Enterprise ERP Platform' },
      rowHash: '0000000000000000000000000000000000000000000000000000000000000000',
    },
  });

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
