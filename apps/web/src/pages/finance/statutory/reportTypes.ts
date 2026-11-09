import type { ApiResponse, BalanceCheckIssue, UnpostedInfo } from '@/types/finance';

/** 409 时后端把校验明细放在 ApiResponse.data 里。 */
export interface ReportConflictPayload {
  checks?: BalanceCheckIssue[];
  unposted?: UnpostedInfo;
}

export interface ReportOutcome<T> {
  report: T | null;
  checks: BalanceCheckIssue[];
  unposted: UnpostedInfo | null;
  conflict: boolean;
}

/** 仅当 HTTP 409 时取出差异明细，其余错误继续抛出交给错误态。 */
export function getConflictPayload<C>(error: unknown): C | null {
  const response = (error as { response?: { status?: number; data?: ApiResponse<C> } } | undefined)
    ?.response;
  if (!response || response.status !== 409) return null;
  return response.data?.data ?? null;
}
