export type RecoveryStatus = "at_risk" | "processing" | "recovered" | "needs_approval" | "rejected";

export type RootCause =
  | "insufficient_funds"
  | "expired_card"
  | "timeout"
  | "do_not_honor"
  | "otp_abandoned"
  | "cart_abandoned";

export type RecoveryAction =
  | "delayed_retry"
  | "update_payment_method"
  | "immediate_retry"
  | "alternate_payment"
  | "fresh_checkout_link"
  | "cart_recovery_nudge";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type PipelineStepName = "ingest" | "diagnose" | "policy" | "gate" | "execute" | "audit";

export interface RecoveryCase {
  id: string;
  runId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  paymentStatus: string;
  declineCode?: string;
  attemptCount: number;
  rootCause?: RootCause;
  confidence?: number;
  recommendedAction?: RecoveryAction;
  actionGated: boolean;
  gateReason?: string;
  actionResult?: RecoveryStatus;
  amountRecovered: number;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface RecoveryAuditEvent {
  id: string;
  eventId: string;
  stepName: PipelineStepName;
  detail: string;
  state?: "done" | "warn" | "current" | "pending";
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Approval {
  id: string;
  eventId: string;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  reason?: string;
}

export interface PolicyRule {
  id: string;
  rootCause: RootCause;
  action: RecoveryAction;
  maxRetries: number;
  cooldownMinutes: number;
  amountCeiling: number;
  confidenceFloor: number;
  permittedChannels: string[];
  requiresApproval: boolean;
  updatedAt: number;
}

export interface PipelineCounters {
  ingest: number;
  diagnose: number;
  policy: number;
  execute: number;
  audit: number;
}

export interface RecoveryRun {
  id: string;
  startedAt: number;
  finishedAt?: number;
  status: "queued" | "running" | "completed";
  totalAtRisk: number;
  totalRecovered: number;
  eventCount: number;
  pipeline?: PipelineCounters;
}

export interface RecoveryReport {
  recoveryRate: number;
  recoveredRevenue: number;
  autoResolutionRate: number;
  approvalCount: number;
  medianApprovalSeconds: number;
  actionPerformance: Array<{
    action: RecoveryAction;
    recovered: number;
    recoveryRate: number;
  }>;
}

export interface PolicySimulationInput {
  maxRetries: number;
  amountCeiling: number;
  confidenceFloor: number;
  cooldownMinutes: number;
  permittedChannels?: string[];
}

export interface PolicySimulationResult {
  totalAnalyzed: number;
  projectedAutoResolved: number;
  projectedGated: number;
  projectedAutoResolutionRate: number;
  projectedRecoveredRevenue: number;
  differenceRevenue: number;
  gatedCaseIds: string[];
}

export interface WebhookIngestInput {
  provider: "stripe" | "razorpay" | "custom";
  payload: Record<string, any>;
}

export interface IngestedPaymentResult {
  success: boolean;
  case: RecoveryCase;
  auditEvents: RecoveryAuditEvent[];
  approval?: Approval;
}
