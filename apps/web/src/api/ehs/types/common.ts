import type { ApiResponse } from '../../client';
import type { PaginatedResponse } from '@topems/shared-types';

export { PaginatedResponse };

export interface ListQueryParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
}
