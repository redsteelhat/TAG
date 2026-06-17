import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_METADATA_KEY = 'auditLog';

export interface AuditLogMetadata {
  action: string;
  entityType?: string;
  entityIdParam?: string;
  entityIdPath?: string;
  userIdPath?: string;
}

export const AuditLog = (metadata: AuditLogMetadata) =>
  SetMetadata(AUDIT_LOG_METADATA_KEY, metadata);
