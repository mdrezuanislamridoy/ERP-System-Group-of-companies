import { ForbiddenException } from '@nestjs/common';
import { RequestContext } from '../interfaces/request-context.interface';

export class UnscopedQueryError extends ForbiddenException {
  constructor(message = 'Unscoped query attempt blocked: request context lacks valid organizational scope.') {
    super({
      code: 'UNSCOPED_QUERY_BLOCKED',
      message,
    });
  }
}

/**
 * Base Scoped Repository pattern from Okobiz ERP Architecture Section 23.
 * Fails closed if query is unscoped.
 * Guarantees that multi-tenant and multi-company data isolation is enforced
 * in the data layer rather than relying on frontend filters.
 */
export abstract class ScopedRepository {
  /**
   * Generates a Prisma where-clause condition based on the caller's active scope.
   * @param ctx Current RequestContext containing caller identity and scope
   * @param companyField The database column for company ID (defaults to 'companyId')
   * @param orgField The database column for specific org/department/branch ID
   */
  protected buildScopeFilter(
    ctx: RequestContext,
    companyField = 'companyId',
    orgField?: string,
  ): Record<string, any> {
    if (!ctx.scope) {
      throw new UnscopedQueryError();
    }

    const { scopeMode, activeCompanyId, descendantOrgIds, activeOrgId, allowedCompanyIds } = ctx.scope;

    // 1. Group level or Cross-company with wildcard
    if (allowedCompanyIds.includes('*')) {
      // If user has group access but is filtered to a specific activeCompanyId context
      if (activeCompanyId) {
        return { [companyField]: activeCompanyId };
      }
      return {}; // Full group view
    }

    // 2. Specific Scope Modes
    switch (scopeMode) {
      case 'SELF':
        if (!ctx.user) throw new UnscopedQueryError('SELF scope requires authenticated user');
        return { createdBy: ctx.user.id };

      case 'NODE':
        if (orgField) {
          return { [orgField]: activeOrgId };
        }
        return { [companyField]: activeCompanyId };

      case 'SUBTREE':
        if (orgField && descendantOrgIds && descendantOrgIds.length > 0) {
          return { [orgField]: { in: descendantOrgIds } };
        }
        return { [companyField]: activeCompanyId };

      case 'CROSS':
        return { [companyField]: { in: allowedCompanyIds } };

      default:
        if (activeCompanyId) {
          return { [companyField]: activeCompanyId };
        }
        throw new UnscopedQueryError('Unrecognized scope mode or missing company context');
    }
  }
}
