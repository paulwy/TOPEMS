import type { ApiResponse, PaginationParams } from '../../client';
import type { PaginatedResponse } from '@topems/shared-types';

export { PaginatedResponse };

export type ListQueryParams = PaginationParams & { status?: string };
