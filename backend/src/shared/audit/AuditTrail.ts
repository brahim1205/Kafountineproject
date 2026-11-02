export type Actor = {
  userId: string | null;
  role: string | null;
  ipAddress: string | null;
};

export type AuditEntry = {
  action: string;
  module: string;
  details: string;
  status?: 'success' | 'warning' | 'error';
};

export interface AuditTrail {
  record(actor: Actor, entry: AuditEntry): Promise<void>;
}

export interface ActorDirectory {
  displayName(userId: string | null): Promise<string>;
}
