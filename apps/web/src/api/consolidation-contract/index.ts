export * from './types';

export { consolidationScopeApiContract, consolidationScopeCompanyApiContract } from './scope';
export { eliminationRuleApiContract } from './elimination';
export { internalTransactionApiContract } from './transaction';
export { consolidationReportApiContract } from './report';
export { companyRelationApiContract } from './company';

import { consolidationScopeApiContract, consolidationScopeCompanyApiContract } from './scope';
import { eliminationRuleApiContract } from './elimination';
import { internalTransactionApiContract } from './transaction';
import { consolidationReportApiContract } from './report';
import { companyRelationApiContract } from './company';

export const consolidationContract = {
  scopes: consolidationScopeApiContract,
  scopeCompanies: consolidationScopeCompanyApiContract,
  eliminationRules: eliminationRuleApiContract,
  internalTransactions: internalTransactionApiContract,
  reports: consolidationReportApiContract,
  companyRelations: companyRelationApiContract,
};

export default consolidationContract;
