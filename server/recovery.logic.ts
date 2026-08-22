import type {
  PolicyRule,
  PolicySimulationInput,
  PolicySimulationResult,
  RecoveryAction,
  RecoveryCase,
  RecoveryStatus,
  RootCause,
} from "@shared/types";

export function evaluatePolicy(
  event: Pick<RecoveryCase, "amount" | "confidence" | "attemptCount">,
  rule: Pick<PolicyRule, "amountCeiling" | "confidenceFloor" | "maxRetries" | "requiresApproval">
) {
  const reasons: string[] = [];
  if (event.amount > rule.amountCeiling) {
    reasons.push("amount exceeds approval ceiling");
  }
  if ((event.confidence ?? 0) < rule.confidenceFloor) {
    reasons.push("diagnosis confidence is below floor");
  }
  if (event.attemptCount >= rule.maxRetries) {
    reasons.push("maximum retry limit reached");
  }
  return {
    gated: rule.requiresApproval || reasons.length > 0,
    reasons,
  };
}

export function resolveRecoveryStatus(input: {
  gated: boolean;
  approval?: "pending" | "approved" | "rejected";
  actionSucceeded?: boolean;
}): RecoveryStatus {
  if (input.gated && input.approval !== "approved") {
    return input.approval === "rejected" ? "rejected" : "needs_approval";
  }
  if (input.actionSucceeded === undefined) {
    return "processing";
  }
  return input.actionSucceeded ? "recovered" : "at_risk";
}

export function normalizeFailureCode(rawCode?: string, provider: "stripe" | "razorpay" | "custom" = "custom"): {
  rootCause: RootCause;
  confidence: number;
} {
  const normalized = (rawCode ?? "").toLowerCase().trim();

  // Stripe & Razorpay error patterns
  if (
    normalized.includes("insufficient") ||
    normalized.includes("insufficient_funds") ||
    normalized.includes("card_velocity_exceeded") ||
    normalized.includes("low_balance")
  ) {
    return { rootCause: "insufficient_funds", confidence: 0.96 };
  }

  if (
    normalized.includes("otp") ||
    normalized.includes("3ds") ||
    normalized.includes("authentication") ||
    normalized.includes("cardholder_action_required") ||
    normalized.includes("user_dropped")
  ) {
    return { rootCause: "otp_abandoned", confidence: 0.91 };
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("gateway_timeout") ||
    normalized.includes("network_error") ||
    normalized.includes("bank_down") ||
    normalized.includes("system_error")
  ) {
    return { rootCause: "timeout", confidence: 0.88 };
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("invalid_expiry") ||
    normalized.includes("expired_card")
  ) {
    return { rootCause: "expired_card", confidence: 0.99 };
  }

  if (
    normalized.includes("cart") ||
    normalized.includes("abandon") ||
    normalized.includes("checkout_dropped")
  ) {
    return { rootCause: "cart_abandoned", confidence: 0.86 };
  }

  // Default fallback for generic decline
  return { rootCause: "do_not_honor", confidence: 0.73 };
}

export function recommendActionForFailure(rootCause: RootCause): RecoveryAction {
  switch (rootCause) {
    case "insufficient_funds":
      return "delayed_retry";
    case "otp_abandoned":
      return "fresh_checkout_link";
    case "timeout":
      return "immediate_retry";
    case "expired_card":
      return "update_payment_method";
    case "cart_abandoned":
      return "cart_recovery_nudge";
    case "do_not_honor":
    default:
      return "alternate_payment";
  }
}

export function simulatePolicyImpact(
  cases: RecoveryCase[],
  candidateRule: PolicySimulationInput
): PolicySimulationResult {
  let projectedGated = 0;
  let projectedAutoResolved = 0;
  let projectedRecoveredRevenue = 0;
  const gatedCaseIds: string[] = [];

  for (const c of cases) {
    const { gated } = evaluatePolicy(
      {
        amount: c.amount,
        confidence: c.confidence ?? 0.85,
        attemptCount: c.attemptCount,
      },
      {
        amountCeiling: candidateRule.amountCeiling,
        confidenceFloor: candidateRule.confidenceFloor,
        maxRetries: candidateRule.maxRetries,
        requiresApproval: false,
      }
    );

    if (gated) {
      projectedGated++;
      gatedCaseIds.push(c.id);
    } else {
      projectedAutoResolved++;
      // If auto-resolved, project 85% success on recovering amount
      projectedRecoveredRevenue += c.amount * 0.85;
    }
  }

  const totalAnalyzed = cases.length;
  const projectedAutoResolutionRate =
    totalAnalyzed > 0 ? projectedAutoResolved / totalAnalyzed : 0;

  const currentRecovered = cases.reduce((acc, cur) => acc + (cur.amountRecovered || 0), 0);
  const differenceRevenue = Math.round(projectedRecoveredRevenue - currentRecovered);

  return {
    totalAnalyzed,
    projectedAutoResolved,
    projectedGated,
    projectedAutoResolutionRate: Number(projectedAutoResolutionRate.toFixed(2)),
    projectedRecoveredRevenue: Math.round(projectedRecoveredRevenue),
    differenceRevenue,
    gatedCaseIds,
  };
}
