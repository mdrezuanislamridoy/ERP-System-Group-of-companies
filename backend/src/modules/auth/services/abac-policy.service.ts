import { Injectable, ForbiddenException } from '@nestjs/common';
import { UserScope } from '../../../common/interfaces/request-context.interface';

@Injectable()
export class AbacPolicyService {
  /**
   * Asserts that a company ID is within the caller's allowed scope.
   */
  assertCompanyScope(scope: UserScope, targetCompanyId: string, actionDescription = 'access resource in') {
    if (scope.allowedCompanyIds.includes('*')) {
      return true;
    }

    if (!scope.allowedCompanyIds.includes(targetCompanyId)) {
      throw new ForbiddenException({
        code: 'ABAC_COMPANY_BOUNDARY_VIOLATION',
        message: `Cross-company access violation: you are not authorized to ${actionDescription} company ${targetCompanyId}.`,
        details: {
          targetCompanyId,
          allowedCompanyIds: scope.allowedCompanyIds,
        },
      });
    }

    return true;
  }

  /**
   * Asserts that an organization node is within the caller's active closure tree.
   */
  assertOrgNodeScope(scope: UserScope, targetOrgId: string, actionDescription = 'access') {
    if (scope.allowedCompanyIds.includes('*')) {
      return true;
    }

    if (scope.activeOrgId === targetOrgId) {
      return true;
    }

    if (scope.scopeMode === 'SUBTREE' && scope.descendantOrgIds.includes(targetOrgId)) {
      return true;
    }

    throw new ForbiddenException({
      code: 'ABAC_ORG_BOUNDARY_VIOLATION',
      message: `Access denied: organization node ${targetOrgId} is outside your active hierarchy scope.`,
      details: {
        activeOrgId: scope.activeOrgId,
        scopeMode: scope.scopeMode,
        targetOrgId,
      },
    });
  }

  /**
   * Asserts that a financial transaction amount does not exceed the caller's approval limit.
   */
  assertFinancialApprovalLimit(scope: UserScope, amount: number, documentType = 'transaction') {
    const limit = scope.financialApprovalLimit;

    if (limit === Infinity || limit === 999999999) {
      return true;
    }

    if (amount > limit) {
      throw new ForbiddenException({
        code: 'APPROVAL_LIMIT_EXCEEDED',
        message: `Amount ${amount.toLocaleString()} BDT exceeds your authorized financial approval threshold of ${limit.toLocaleString()} BDT for ${documentType}.`,
        details: {
          requestedAmount: amount,
          approvalLimit: limit,
          excess: amount - limit,
        },
      });
    }

    return true;
  }

  /**
   * Asserts Segregation of Duties (SoD) — prevent self-approval of own requests.
   */
  assertSegregationOfDuties(callerUserId: string, requesterUserId?: string | null, documentNumber?: string) {
    if (!requesterUserId) return true;

    if (callerUserId === requesterUserId) {
      throw new ForbiddenException({
        code: 'SEGREGATION_OF_DUTIES_VIOLATION',
        message: `Segregation of duties violation: you cannot approve or audit your own request (${documentNumber || 'document'}).`,
        details: {
          callerUserId,
          requesterUserId,
        },
      });
    }

    return true;
  }
}
