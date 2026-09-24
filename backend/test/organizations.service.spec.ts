import { test, describe, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { RequestContext } from '../src/common/interfaces/request-context.interface';

// ─── Mocks & Test Fixtures ───────────────────────────────────────────────────

function createMockPrismaService() {
  const store = {
    organizations: [
      {
        id: 'grp-abc',
        parentId: null,
        companyId: null,
        type: 'GROUP',
        code: 'ABC-GRP',
        name: 'ABC Group Holdings PLC',
        path: '/grp-abc',
        depth: 0,
        status: 'ACTIVE',
        currency: 'BDT',
        deletedAt: null,
      },
      {
        id: 'c-foods',
        parentId: 'grp-abc',
        companyId: 'c-foods',
        type: 'LEGAL_ENTITY',
        code: 'ABC-FOODS',
        name: 'ABC Foods Ltd.',
        path: '/grp-abc/c-foods',
        depth: 1,
        status: 'ACTIVE',
        currency: 'BDT',
        deletedAt: null,
      },
    ] as any[],
    companyModules: [
      { id: 'cm-1', companyId: 'c-foods', moduleKey: 'procurement', status: 'ACTIVE', settings: null },
      { id: 'cm-2', companyId: 'c-foods', moduleKey: 'finance', status: 'ACTIVE', settings: null },
    ] as any[],
    closures: [
      { ancestorId: 'grp-abc', descendantId: 'grp-abc', depth: 0 },
      { ancestorId: 'grp-abc', descendantId: 'c-foods', depth: 1 },
      { ancestorId: 'c-foods', descendantId: 'c-foods', depth: 0 },
    ] as any[],
  };

  const prisma: any = {
    organization: {
      findFirst: async ({ where }: any) => {
        return store.organizations.find((o) => {
          if (where.deletedAt === null && o.deletedAt !== null) return false;
          if (where.code && o.code !== where.code) return false;
          if (where.type && o.type !== where.type) return false;
          if (where.parentId === null && o.parentId !== null) return false;
          if (where.parentId && o.parentId !== where.parentId) return false;
          return true;
        }) || null;
      },
      findUnique: async ({ where }: any) => {
        return store.organizations.find((o) => o.id === where.id) || null;
      },
      findMany: async () => store.organizations.filter((o) => !o.deletedAt),
      create: async ({ data }: any) => {
        store.organizations.push(data);
        return data;
      },
      update: async ({ where, data }: any) => {
        const item = store.organizations.find((o) => o.id === where.id);
        if (!item) throw new Error('Not found');
        Object.assign(item, data);
        return item;
      },
    },
    companyModule: {
      findMany: async ({ where }: any) => {
        return store.companyModules.filter((m) => m.companyId === where.companyId);
      },
      create: async ({ data }: any) => {
        store.companyModules.push(data);
        return data;
      },
      upsert: async ({ where, create, update }: any) => {
        const idx = store.companyModules.findIndex(
          (m) => m.companyId === where.companyId_moduleKey.companyId && m.moduleKey === where.companyId_moduleKey.moduleKey
        );
        if (idx !== -1) {
          Object.assign(store.companyModules[idx], update);
          return store.companyModules[idx];
        } else {
          store.companyModules.push(create);
          return create;
        }
      },
    },
    organizationClosure: {
      findMany: async ({ where }: any) => {
        return store.closures.filter((c) => c.descendantId === where.descendantId);
      },
      createMany: async ({ data }: any) => {
        store.closures.push(...data);
        return { count: data.length };
      },
    },
    $transaction: async (cb: (tx: any) => Promise<any>) => {
      return cb(prisma);
    },
  };

  return { prisma, store };
}

function createMockAuditService() {
  const logs: any[] = [];
  return {
    logs,
    log: async (entry: any) => {
      logs.push(entry);
      return entry;
    },
  };
}

function createRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    correlationId: 'test-req-123',
    user: {
      id: 'usr-admin',
      personId: 'per-admin',
      email: 'admin@abcgroup.com',
      permissions: ['org.read', 'org.write', 'company.manage'],
    },
    scope: {
      userId: 'usr-admin',
      assignmentId: 'asg-admin',
      roleKey: 'group-ceo',
      activeOrgId: 'grp-abc',
      activeCompanyId: null,
      scopeMode: 'CROSS',
      allowedCompanyIds: ['*'],
      allowedBranchIds: ['*'],
      allowedDepartmentIds: ['*'],
      descendantOrgIds: ['*'],
      financialApprovalLimit: 100000000,
    },
    ...overrides,
  };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('OrganizationsService (Section 1: Multi-Entity Hierarchy)', () => {
  let service: OrganizationsService;
  let mockPrisma: any;
  let mockStore: any;
  let mockAudit: any;

  beforeEach(() => {
    const { prisma, store } = createMockPrismaService();
    mockPrisma = prisma;
    mockStore = store;
    mockAudit = createMockAuditService();
    service = new OrganizationsService(mockPrisma, mockAudit);
  });

  test('createCompany: successfully creates a legal entity with closure rows & modules', async () => {
    const ctx = createRequestContext();
    const dto = {
      name: 'ABC Agro Industries Ltd.',
      code: 'ABC-AGRO',
      legalName: 'ABC Agro Industries Limited',
      sector: 'Agro & Food Processing',
      currency: 'BDT',
      taxId: 'TIN-9812401',
      binNumber: 'BIN-10293847',
      incorporatedYear: 2026,
      modules: ['procurement', 'inventory', 'finance', 'hr'],
    };

    const created = await service.createCompany(dto, ctx);

    assert.ok(created);
    assert.strictEqual(created.code, 'ABC-AGRO');
    assert.strictEqual(created.type, 'LEGAL_ENTITY');
    assert.strictEqual(created.parentId, 'grp-abc');
    assert.strictEqual(created.depth, 1);
    assert.strictEqual(created.currency, 'BDT');

    // Check module provision
    const modules = mockStore.companyModules.filter((m: any) => m.companyId === created.id);
    assert.strictEqual(modules.length, 4);

    // Check closure depth
    const selfClosure = mockStore.closures.find((c: any) => c.ancestorId === created.id && c.descendantId === created.id);
    assert.ok(selfClosure);
    assert.strictEqual(selfClosure.depth, 0);

    const groupClosure = mockStore.closures.find((c: any) => c.ancestorId === 'grp-abc' && c.descendantId === created.id);
    assert.ok(groupClosure);
    assert.strictEqual(groupClosure.depth, 1);

    // Check audit logging
    assert.strictEqual(mockAudit.logs.length, 1);
    assert.strictEqual(mockAudit.logs[0].action, 'ORGANIZATION_COMPANY_CREATED');
  });

  test('createCompany: throws ConflictException on duplicate code', async () => {
    const ctx = createRequestContext();
    const dto = {
      name: 'Duplicate Foods',
      code: 'ABC-FOODS', // Already exists in mock store
    };

    await assert.rejects(
      async () => service.createCompany(dto, ctx),
      (err: any) => {
        assert.ok(err instanceof ConflictException);
        assert.match(err.message, /already exists/);
        return true;
      }
    );
  });

  test('createCompany: enforces Group Scope requirement', async () => {
    // Restricted context without group-level permissions
    const restrictedCtx = createRequestContext({
      scope: {
        userId: 'usr-restricted',
        assignmentId: 'asg-local',
        roleKey: 'plant-operator',
        activeOrgId: 'c-foods',
        activeCompanyId: 'c-foods',
        scopeMode: 'NODE',
        allowedCompanyIds: ['c-foods'],
        allowedBranchIds: [],
        allowedDepartmentIds: [],
        descendantOrgIds: [],
        financialApprovalLimit: 0,
      },
    });

    const dto = {
      name: 'Unauthorized Sister Concern',
      code: 'UNAUTH-CO',
    };

    await assert.rejects(
      async () => service.createCompany(dto, restrictedCtx),
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        assert.strictEqual((err.getResponse() as any).code, 'GROUP_SCOPE_REQUIRED');
        return true;
      }
    );
  });

  test('configureCompanyModules: updates module status and audits change', async () => {
    const ctx = createRequestContext();
    const result = await service.configureCompanyModules(
      'c-foods',
      {
        modules: [
          { moduleKey: 'manufacturing', status: 'ACTIVE' },
          { moduleKey: 'procurement', status: 'INACTIVE' },
        ],
      },
      ctx
    );

    assert.ok(result);
    assert.strictEqual(result.length, 3);

    const procMod = mockStore.companyModules.find((m: any) => m.companyId === 'c-foods' && m.moduleKey === 'procurement');
    assert.ok(procMod);
    assert.strictEqual(procMod.status, 'INACTIVE');

    assert.strictEqual(mockAudit.logs.length, 1);
    assert.strictEqual(mockAudit.logs[0].action, 'COMPANY_MODULES_CONFIGURED');
  });

  test('createNode: creates operational child units under parent legal entity', async () => {
    const ctx = createRequestContext();
    const nodeDto = {
      parentId: 'c-foods',
      type: 'BRANCH_PLANT' as any,
      code: 'PLANT-SAVAR-01',
      name: 'Savar High-Capacity Processing Plant',
      city: 'Savar',
      headPerson: 'Shahidul Alam',
    };

    const createdNode = await service.createNode(nodeDto, ctx);

    assert.ok(createdNode);
    assert.strictEqual(createdNode.name, 'Savar High-Capacity Processing Plant');
    assert.strictEqual(createdNode.companyId, 'c-foods');
    assert.strictEqual(createdNode.depth, 2);
    assert.strictEqual(createdNode.type, 'BRANCH_PLANT');

    assert.strictEqual(mockAudit.logs.length, 1);
    assert.strictEqual(mockAudit.logs[0].action, 'ORGANIZATION_NODE_CREATED');
  });

  test('createNode: rejects creating child units under non-existent parent', async () => {
    const ctx = createRequestContext();
    const nodeDto = {
      parentId: 'non-existent-parent',
      type: 'DEPARTMENT' as any,
      code: 'DEPT-ORPHAN',
      name: 'Orphan Department',
    };

    await assert.rejects(
      async () => service.createNode(nodeDto, ctx),
      (err: any) => {
        assert.ok(err instanceof NotFoundException);
        assert.match(err.message, /not found/);
        return true;
      }
    );
  });
});
