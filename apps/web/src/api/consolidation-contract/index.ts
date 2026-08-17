import { consolidationScopeApi, consolidationScopeCompanyApi } from './scope';
import { eliminationRuleApi } from './elimination';
import { internalTransactionApi } from './transaction';
import { consolidationReportApi } from './report';
import { companyRelationApi } from './company';

export * from './types';

export { consolidationScopeApi, consolidationScopeCompanyApi } from './scope';
export { eliminationRuleApi } from './elimination';
export { internalTransactionApi } from './transaction';
export { consolidationReportApi } from './report';
export { companyRelationApi } from './company';

export const consolidationContractApi = {
  scopes: consolidationScopeApi,
  scopeCompanies: consolidationScopeCompanyApi,
  eliminationRules: eliminationRuleApi,
  internalTransactions: internalTransactionApi,
  reports: consolidationReportApi,
  companyRelations: companyRelationApi,
};

export default consolidationContractApi;
