import { consolidationScopeApi, consolidationScopeCompanyApi } from './scope';
import { eliminationRuleApi } from './elimination';
import { internalTransactionApi } from './transaction';
import { consolidationReportApi } from './report';
import { companyRelationApi } from './company';

export * from './types';

export { eliminationRuleApi } from './elimination';
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
