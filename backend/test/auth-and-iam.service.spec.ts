import { test, describe, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { IamService } from '../src/modules/iam/iam.service';
import { AbacPolicyService } from '../src/modules/auth/services/abac-policy.service';
import { RequestContext } from '../src/common/interfaces/request-context.interface';

// ─── Mock Fixtures ───────────────────────────────────────────────────────────

const TEST_PASSWORD = 'Password123!';
const HASHED_PASSWORD = bcrypt.hashSync(TEST_PASSWORD, 10);

function createMockPrismaService() {
  const store = {
    persons: [
      {
        id: 'per-rahim',
        firstName: 'Rahim',
        lastName: 'Ahmed',
        email: 'rahim.ahmed@abcgroup.com',
        phone: '+8801711000111',
        employeeNo: 'EMP-10241',
        baseSalary: 118000,
        bankAccount: '01-8834921-01',
        bankName: 'Standard Chartered Bank',
      },
    ] as any[],
    users: [
      {
        id: 'u-rahim',
        personId: 'per-rahim',
        employeeId: 'EMP-10241',
        email: 'rahim.ahmed@abcgroup.com',
        passwordHash: HASHED_PASSWORD,
        permissionsVersion: 1,
        status: 'ACTIVE',
        failedAttempts: 0,
        lockedUntil: null,
      },
    ] as any[],
    roles: [
      {
        id: 'r-fin-mgr',
        key: 'finance-manager',
        name: 'Finance Manager',
        level: 'COMPANY',
        permissions: [
          { effect: 'ALLOW', permission: { key: 'finance.gl.read' } },
          { effect: 'ALLOW', permission: { key: 'finance.gl.post' } },
          { effect: 'ALLOW', permission: { key: 'org.read' } },
        ],
      },
      {
        id: 'r-auditor',
        key: 'internal-auditor',
        name: 'Internal Auditor',
        level: 'GROUP',
        permissions: [
          { effect: 'ALLOW', permission: { key: 'audit.logs.read' } },
          { effect: 'ALLOW', permission: { key: 'sensitive.salary.read' } },
          { effect: 'ALLOW', permission: { key: 'org.read' } },
        ],
      },
    ] as any[],
    organizations: [
      { id: 'grp-abc', type: 'GROUP', code: 'ABC-GRP', name: 'ABC Group Holdings PLC', companyId: null },
      { id: 'c-foods', type: 'LEGAL_ENTITY', code: 'ABC-FOODS', name: 'ABC Foods Ltd.', companyId: 'c-foods' },
      { id: 'org-fin', type: 'DEPARTMENT', code: 'FOODS-FIN', name: 'Finance HQ', companyId: 'c-foods' },
      { id: 'c-trans', type: 'LEGAL_ENTITY', code: 'ABC-TRANS', name: 'ABC Transport Ltd.', companyId: 'c-trans' },
    ] as any[],
    assignments: [
      {
        id: 'asg-rahim-1',
        userId: 'u-rahim',
        roleId: 'r-fin-mgr',
        organizationId: 'org-fin',
        companyId: 'c-foods',
        scopeMode: 'SUBTREE',
        excludedOrgIds: [],
        validTo: null,
        title: 'Senior Finance Manager',
      },
      {
        id: 'asg-rahim-2',
        userId: 'u-rahim',
        roleId: 'r-auditor',
        organizationId: 'grp-abc',
        companyId: null,
        scopeMode: 'CROSS',
        excludedOrgIds: [],
        validTo: null,
        title: 'Internal Audit Lead',
      },
    ] as any[],
    sessions: [] as any[],
  };

  const prisma: any = {
    user: {
      findFirst: async ({ where }: any) => {
        return store.users
          .map((u) => ({
            ...u,
            person: store.persons.find((p) => p.id === u.personId),
            assignments: store.assignments
              .filter((a) => a.userId === u.id)
              .map((a) => ({
                ...a,
                role: store.roles.find((r) => r.id === a.roleId),
                organization: store.organizations.find((o) => o.id === a.organizationId),
              })),
          }))
          .find((u) => {
            if (where.id && u.id !== where.id) return false;
            if (where.employeeId && u.employeeId === where.employeeId) return true;
            if (where.email && u.email === where.email) return true;
            if (where.OR) {
              return where.OR.some((cond: any) => {
                if (cond.employeeId && u.employeeId === cond.employeeId) return true;
                if (cond.email && u.email === cond.email) return true;
                if (cond.person?.employeeNo && u.person?.employeeNo === cond.person.employeeNo) return true;
                if (cond.person?.email && u.person?.email === cond.person.email) return true;
                return false;
              });
            }
            return false;
          }) || null;
      },
      findUnique: async ({ where }: any) => {
        const u = store.users.find((user) => user.id === where.id);
        if (!u) return null;
        return {
          ...u,
          person: store.persons.find((p) => p.id === u.personId),
          assignments: store.assignments
            .filter((a) => a.userId === u.id)
            .map((a) => ({
              ...a,
              role: store.roles.find((r) => r.id === a.roleId),
              organization: store.organizations.find((o) => o.id === a.organizationId),
            })),
        };
      },
      findMany: async () => {
        return store.users.map((u) => ({
          ...u,
          person: store.persons.find((p) => p.id === u.personId),
          assignments: store.assignments
            .filter((a) => a.userId === u.id)
            .map((a) => ({
              ...a,
              role: store.roles.find((r) => r.id === a.roleId),
              organization: store.organizations.find((o) => o.id === a.organizationId),
            })),
        }));
      },
      create: async ({ data }: any) => {
        store.users.push(data);
        return data;
      },
      update: async ({ where, data }: any) => {
        const item = store.users.find((u) => u.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      },
    },
    person: {
      findUnique: async ({ where }: any) => store.persons.find((p) => p.id === where.id || p.email === where.email) || null,
      findFirst: async ({ where }: any) => {
        return store.persons.find((p) => {
          if (where.email && p.email === where.email) return true;
          if (where.employeeNo && p.employeeNo === where.employeeNo) return true;
          return false;
        }) || null;
      },
      create: async ({ data }: any) => {
        store.persons.push(data);
        return data;
      },
    },
    session: {
      create: async ({ data }: any) => {
        const session = { id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, ...data };
        store.sessions.push(session);
        return session;
      },
      findFirst: async ({ where }: any) => {
        const sess = store.sessions.find((s) => s.refreshTokenHash === where.refreshTokenHash);
        if (!sess) return null;
        const u = store.users.find((user) => user.id === sess.userId);
        return {
          ...sess,
          user: u
            ? {
                ...u,
                person: store.persons.find((p) => p.id === u.personId),
                assignments: store.assignments
                  .filter((a) => a.userId === u.id)
                  .map((a) => ({
                    ...a,
                    role: store.roles.find((r) => r.id === a.roleId),
                    organization: store.organizations.find((o) => o.id === a.organizationId),
                  })),
              }
            : null,
        };
      },
      update: async ({ where, data }: any) => {
        const sess = store.sessions.find((s) => s.id === where.id);
        if (sess) Object.assign(sess, data);
        return sess;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        store.sessions.forEach((s) => {
          if (s.userId === where.userId) {
            Object.assign(s, data);
            count++;
          }
        });
        return { count };
      },
    },
    role: {
      findUnique: async ({ where }: any) => store.roles.find((r) => r.id === where.id || r.key === where.key) || null,
      findMany: async () => store.roles,
    },
    permission: {
      findMany: async () => [
        { id: 'p1', key: 'finance.gl.read', moduleKey: 'finance' },
        { id: 'p2', key: 'finance.gl.post', moduleKey: 'finance' },
        { id: 'p3', key: 'org.read', moduleKey: 'org' },
        { id: 'p4', key: 'sensitive.salary.read', moduleKey: 'hr' },
      ],
    },
    organization: {
      findUnique: async ({ where }: any) => store.organizations.find((o) => o.id === where.id) || null,
    },
    organizationClosure: {
      findMany: async () => [],
      findUnique: async () => null,
    },
    userRoleAssignment: {
      create: async ({ data }: any) => {
        store.assignments.push(data);
        return data;
      },
    },
    $transaction: async (cb: (tx: any) => Promise<any>) => cb(prisma),
  };

  return { prisma, store };
}

function createMockJwtService() {
  return {
    sign: (payload: any) => `mock_jwt_token.${Buffer.from(JSON.stringify(payload)).toString('base64')}`,
  } as any;
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

// ─── Test Suites ─────────────────────────────────────────────────────────────

describe('SECTION 2: Identity, IAM & Authentication', () => {
  let authService: AuthService;
  let iamService: IamService;
  let mockPrisma: any;
  let mockStore: any;
  let mockAudit: any;
  let abacPolicy: AbacPolicyService;

  beforeEach(() => {
    const { prisma, store } = createMockPrismaService();
    mockPrisma = prisma;
    mockStore = store;
    mockAudit = createMockAuditService();
    const jwtService = createMockJwtService();
    abacPolicy = new AbacPolicyService();

    authService = new AuthService(mockPrisma, jwtService, mockAudit, abacPolicy);
    iamService = new IamService(mockPrisma, mockAudit, abacPolicy);
  });

  // ─── 1. Authentication & Login Tests ────────────────────────────────────────

  test('login: successfully authenticates with valid Employee ID and password', async () => {
    const res = await authService.login('EMP-10241', TEST_PASSWORD);

    assert.ok(res.accessToken);
    assert.ok(res.refreshToken);
    assert.strictEqual(res.user.employeeId, 'EMP-10241');
    assert.strictEqual(res.user.name, 'Rahim Ahmed');
    assert.strictEqual(res.user.status, 'ACTIVE');

    // Check active assignment
    assert.strictEqual(res.activeAssignment.roleKey, 'finance-manager');
    assert.strictEqual(res.activeAssignment.companyId, 'c-foods');

    // Check multiple available assignments
    assert.strictEqual(res.availableAssignments.length, 2);

    // Check permissions granted
    assert.ok(res.permissions.includes('finance.gl.read'));
    assert.ok(res.permissions.includes('finance.gl.post'));

    // Check audit logging
    assert.strictEqual(mockAudit.logs.length, 1);
    assert.strictEqual(mockAudit.logs[0].action, 'USER_LOGIN_SUCCESS');
  });

  test('login: rejects invalid password and logs failed attempt', async () => {
    await assert.rejects(
      async () => authService.login('EMP-10241', 'WrongPassword!'),
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /Invalid credentials/);
        return true;
      }
    );

    // Failed attempt recorded
    const user = mockStore.users.find((u: any) => u.employeeId === 'EMP-10241');
    assert.strictEqual(user.failedAttempts, 1);

    // Audit log recorded
    assert.strictEqual(mockAudit.logs.length, 1);
    assert.strictEqual(mockAudit.logs[0].action, 'LOGIN_FAILED_BAD_PASSWORD');
  });

  test('login: temporarily locks account after repeated failed attempts', async () => {
    const user = mockStore.users.find((u: any) => u.employeeId === 'EMP-10241');
    user.failedAttempts = 4; // 5th attempt will trigger lockout

    await assert.rejects(
      async () => authService.login('EMP-10241', 'WrongPasswordAgain!'),
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        assert.strictEqual((err.getResponse() as any).code, 'ACCOUNT_LOCKED');
        return true;
      }
    );

    assert.strictEqual(user.failedAttempts, 5);
    assert.ok(user.lockedUntil !== null);
  });

  // ─── 2. Refresh Token Rotation & Token Reuse Detection ─────────────────────

  test('rotateRefreshToken: successfully rotates refresh token and returns new access token', async () => {
    // Perform login first to generate session
    const loginRes = await authService.login('EMP-10241', TEST_PASSWORD);
    const oldRefreshToken = loginRes.refreshToken;

    const rotateRes = await authService.rotateRefreshToken(oldRefreshToken);

    assert.ok(rotateRes.accessToken);
    assert.ok(rotateRes.refreshToken);
    assert.notStrictEqual(rotateRes.refreshToken, oldRefreshToken);
  });

  test('rotateRefreshToken: detects reuse of revoked refresh token and revokes all sessions', async () => {
    // 1. Establish an active session for the user
    await authService.login('EMP-10241', TEST_PASSWORD);
    assert.strictEqual(mockStore.sessions.length, 1);

    // 2. Add an already-revoked session representing a compromised/stolen token
    const revokedToken = 'stolen_revoked_refresh_token_xyz';
    const revokedHash = crypto.createHash('sha256').update(revokedToken).digest('hex');
    mockStore.sessions.push({
      id: 'sess-stolen',
      userId: 'u-rahim',
      refreshTokenHash: revokedHash,
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: new Date(Date.now() - 3600000),
    });

    // 3. Replay attack: Attacker attempts to use the revoked refresh token
    await assert.rejects(
      async () => authService.rotateRefreshToken(revokedToken),
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.match(err.message, /revoked/);
        return true;
      }
    );

    // 4. Critical security check: All sessions for the user must now be revoked
    const activeSessions = mockStore.sessions.filter((s: any) => s.userId === 'u-rahim' && !s.revokedAt);
    assert.strictEqual(activeSessions.length, 0);

    const alertAudit = mockAudit.logs.find((l: any) => l.action === 'SECURITY_ALERT_REFRESH_TOKEN_REUSE');
    assert.ok(alertAudit);
  });

  // ─── 3. Active Context Switching ───────────────────────────────────────────

  test('switchContext: switches user active operating entity without logging out', async () => {
    const res = await authService.switchContext('u-rahim', 'grp-abc');

    assert.ok(res.accessToken);
    assert.strictEqual(res.activeAssignment.roleKey, 'internal-auditor');
    assert.strictEqual(res.activeAssignment.organizationId, 'grp-abc');
  });

  test('switchContext: rejects switching to an unauthorized organization', async () => {
    await assert.rejects(
      async () => authService.switchContext('u-rahim', 'c-trans'),
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        assert.strictEqual((err.getResponse() as any).code, 'UNAUTHORIZED_CONTEXT_SWITCH');
        return true;
      }
    );
  });

  // ─── 4. IAM Directory & Field-Level Masking ────────────────────────────────

  test('getUsers: masks sensitive salary and bank details when caller lacks sensitive.salary.read', async () => {
    const ctx: RequestContext = {
      correlationId: 'req-test',
      user: { id: 'u-user', personId: 'per-user', email: 'user@abc.com', permissions: ['org.read'] },
      scope: { roleKey: 'employee' } as any,
    };

    const users = await iamService.getUsers(ctx);
    const rahim = users.find((u) => u.employeeId === 'EMP-10241');

    assert.ok(rahim);
    assert.strictEqual(rahim.baseSalary, '••••••••');
    assert.strictEqual(rahim.bankAccount, '••••-••••-••••');
  });

  test('getUsers: reveals salary and bank details when caller holds sensitive.salary.read', async () => {
    const ctx: RequestContext = {
      correlationId: 'req-test',
      user: { id: 'u-auditor', personId: 'per-auditor', email: 'auditor@abc.com', permissions: ['org.read', 'sensitive.salary.read'] },
      scope: { roleKey: 'internal-auditor' } as any,
    };

    const users = await iamService.getUsers(ctx);
    const rahim = users.find((u) => u.employeeId === 'EMP-10241');

    assert.ok(rahim);
    assert.strictEqual(rahim.baseSalary, 118000);
    assert.strictEqual(rahim.bankAccount, '01-8834921-01');
  });

  // ─── 5. Employee User Provisioning ─────────────────────────────────────────

  test('createEmployeeUser: successfully provisions new employee and user account', async () => {
    const adminCtx: RequestContext = {
      correlationId: 'req-test-admin',
      user: { id: 'u-admin', personId: 'per-admin', email: 'admin@abc.com', permissions: ['iam.user.create', 'org.write'] },
      scope: {
        roleKey: 'group-ceo',
        allowedCompanyIds: ['*'],
      } as any,
    };

    const newEmpDto = {
      employeeId: 'EMP-10999',
      firstName: 'Farhana',
      lastName: 'Zaman',
      email: 'farhana.zaman@abcgroup.com',
      companyId: 'c-foods',
      organizationId: 'org-fin',
      roleKey: 'finance-manager',
      title: 'Deputy Finance Manager',
      baseSalary: 95000,
      initialPassword: 'TempPassword2026!',
    };

    const created = await iamService.createEmployeeUser(newEmpDto, adminCtx);

    assert.ok(created);
    assert.strictEqual(created.employeeId, 'EMP-10999');
    assert.strictEqual(created.email, 'farhana.zaman@abcgroup.com');

    // Person and User created
    const createdUser = mockStore.users.find((u: any) => u.employeeId === 'EMP-10999');
    assert.ok(createdUser);
    assert.strictEqual(createdUser.status, 'ACTIVE');

    // Role assignment created
    const assignment = mockStore.assignments.find((a: any) => a.userId === createdUser.id);
    assert.ok(assignment);
    assert.strictEqual(assignment.companyId, 'c-foods');

    // Audit logged
    assert.ok(mockAudit.logs.some((l: any) => l.action === 'EMPLOYEE_USER_CREATED'));
  });

  test('createEmployeeUser: rejects cross-company provisioning without company scope', async () => {
    // Restricted HR manager at ABC Transport attempting to create user in ABC Foods
    const restrictedCtx: RequestContext = {
      correlationId: 'req-test-restricted',
      user: { id: 'u-trans-hr', personId: 'per-trans-hr', email: 'hr@transport.abc.com', permissions: ['iam.user.create', 'org.write'] },
      scope: {
        roleKey: 'company-ceo',
        activeCompanyId: 'c-trans',
        allowedCompanyIds: ['c-trans'],
      } as any,
    };

    const newEmpDto = {
      employeeId: 'EMP-10998',
      firstName: 'Intruder',
      lastName: 'User',
      email: 'intruder@foods.abc.com',
      companyId: 'c-foods', // Outside allowedCompanyIds ('c-trans')
      organizationId: 'org-fin',
      roleKey: 'finance-manager',
      initialPassword: 'TempPassword2026!',
    };

    await assert.rejects(
      async () => iamService.createEmployeeUser(newEmpDto, restrictedCtx),
      (err: any) => {
        assert.ok(err instanceof ForbiddenException);
        assert.strictEqual((err.getResponse() as any).code, 'ABAC_COMPANY_BOUNDARY_VIOLATION');
        return true;
      }
    );
  });
});
