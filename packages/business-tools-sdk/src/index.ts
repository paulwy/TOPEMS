/** 业务工具 SDK V0.1 (TS)：组合入口 */

export { HttpTransport, bearerAuth, type HttpTransportOptions, type FetchLike } from './transport.js';
export type {
  Paged,
  PageParams,
  Permission,
  Role,
  AuditLogEntry,
  RetentionPolicy,
  RetentionTaskStatus,
  ExportTaskStatus,
  BatchResult,
} from './types.js';
export { PermissionsClient } from './clients/permissions.js';
export { AuditLogsClient, type AuditLogQuery } from './clients/audit-logs.js';
export {
  RetentionClient,
  RetentionTaskClient,
  ExportTaskClient,
  type RetentionPolicyInput,
} from './clients/retention.js';

import { HttpTransport, type HttpTransportOptions } from './transport.js';
import { PermissionsClient } from './clients/permissions.js';
import { AuditLogsClient } from './clients/audit-logs.js';
import { RetentionClient, RetentionTaskClient, ExportTaskClient } from './clients/retention.js';

/** BusinessToolsClient：组合 5 个子客户端（permissions/auditLogs/retention/retentionTask/exportTask）。 */
export class BusinessToolsClient {
  readonly permissions: PermissionsClient;
  readonly auditLogs: AuditLogsClient;
  readonly retention: RetentionClient;
  readonly retentionTask: RetentionTaskClient;
  readonly exportTask: ExportTaskClient;

  constructor(options: HttpTransportOptions) {
    const http = new HttpTransport(options);
    this.permissions = new PermissionsClient(http);
    this.auditLogs = new AuditLogsClient(http);
    this.retention = new RetentionClient(http);
    this.retentionTask = new RetentionTaskClient(http);
    this.exportTask = new ExportTaskClient(http);
  }
}

export default BusinessToolsClient;
