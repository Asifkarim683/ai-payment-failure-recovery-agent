import { describe, expect, it } from "vitest";
import {
  evaluatePolicy,
  normalizeFailureCode,
  recommendActionForFailure,
  resolveRecoveryStatus,
  simulatePolicyImpact,
} from "./recovery.logic";
import type { RecoveryCase } from "@shared/types";

describe("evaluatePolicy", () => {
  const rule = {
    amountCeiling: 10000,
    confidenceFloor: 0.82,
    maxRetries: 2,
    requiresApproval: false,
  };

  it("gates high-value events", () => {
    expect(
      evaluatePolicy({ amount: 12000, confidence: 0.95, attemptCount: 0 }, rule)
    ).toMatchObject({
      gated: true,
      reasons: ["amount exceeds approval ceiling"],
    });
  });

  it("gates low-confidence diagnoses", () => {
    expect(
      evaluatePolicy({ amount: 5000, confidence: 0.61, attemptCount: 0 }, rule).gated
    ).toBe(true);
  });

  it("gates events at the retry limit", () => {
    expect(
      evaluatePolicy({ amount: 5000, confidence: 0.95, attemptCount: 2 }, rule).reasons
    ).toContain("maximum retry limit reached");
  });

  it("keeps bounded, eligible events automated", () => {
    expect(
      evaluatePolicy({ amount: 5000, confidence: 0.95, attemptCount: 1 }, rule)
    ).toEqual({ gated: false, reasons: [] });
  });
});

describe("resolveRecoveryStatus", () => {
  it("keeps pending approvals explicit", () => {
    expect(resolveRecoveryStatus({ gated: true, approval: "pending" })).toBe(
      "needs_approval"
    );
  });

  it("records rejected actions without execution", () => {
    expect(resolveRecoveryStatus({ gated: true, approval: "rejected" })).toBe(
      "rejected"
    );
  });

  it("only resolves a gated action after approval", () => {
    expect(
      resolveRecoveryStatus({
        gated: true,
        approval: "approved",
        actionSucceeded: true,
      })
    ).toBe("recovered");
  });

  it("reports failed execution as still at risk", () => {
    expect(
      resolveRecoveryStatus({ gated: false, actionSucceeded: false })
    ).toBe("at_risk");
  });
});

describe("normalizeFailureCode", () => {
  it("normalizes insufficient funds codes correctly", () => {
    const res = normalizeFailureCode("insufficient_funds", "stripe");
    expect(res.rootCause).toBe("insufficient_funds");
    expect(res.confidence).toBeGreaterThan(0.9);
  });

  it("normalizes 3DS/OTP dropouts correctly", () => {
    const res = normalizeFailureCode("cardholder_action_required", "stripe");
    expect(res.rootCause).toBe("otp_abandoned");
    expect(res.confidence).toBe(0.91);
  });

  it("normalizes gateway timeouts correctly", () => {
    const res = normalizeFailureCode("gateway_timeout", "razorpay");
    expect(res.rootCause).toBe("timeout");
  });
});

describe("recommendActionForFailure", () => {
  it("maps insufficient funds to delayed retry", () => {
    expect(recommendActionForFailure("insufficient_funds")).toBe("delayed_retry");
  });

  it("maps OTP abandoned to fresh checkout link", () => {
    expect(recommendActionForFailure("otp_abandoned")).toBe("fresh_checkout_link");
  });

  it("maps expired card to update payment method", () => {
    expect(recommendActionForFailure("expired_card")).toBe("update_payment_method");
  });
});

describe("simulatePolicyImpact", () => {
  const cases: RecoveryCase[] = [
    {
      id: "c1",
      runId: "r1",
      merchantId: "m1",
      merchantName: "Test 1",
      amount: 15000,
      paymentStatus: "failed",
      attemptCount: 0,
      confidence: 0.95,
      actionGated: true,
      amountRecovered: 0,
      createdAt: Date.now(),
    },
    {
      id: "c2",
      runId: "r1",
      merchantId: "m2",
      merchantName: "Test 2",
      amount: 5000,
      paymentStatus: "failed",
      attemptCount: 0,
      confidence: 0.9,
      actionGated: false,
      amountRecovered: 5000,
      createdAt: Date.now(),
    },
  ];

  it("calculates projection metrics for policy threshold changes", () => {
    // If ceiling is 20000, both cases should auto-resolve
    const result = simulatePolicyImpact(cases, {
      amountCeiling: 20000,
      confidenceFloor: 0.8,
      maxRetries: 2,
      cooldownMinutes: 240,
    });

    expect(result.totalAnalyzed).toBe(2);
    expect(result.projectedAutoResolved).toBe(2);
    expect(result.projectedGated).toBe(0);
    expect(result.projectedAutoResolutionRate).toBe(1);
  });
});
