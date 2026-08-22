import { describe, expect, it } from "vitest";
import { executeRecoveryAction } from "./execution";
import type { RecoveryCase } from "@shared/types";

describe("executeRecoveryAction", () => {
  const sampleCase: RecoveryCase = {
    id: "evt_exec_test_1",
    runId: "run_test",
    merchantId: "m_test",
    merchantName: "Execution Merchant",
    amount: 8500,
    paymentStatus: "failed",
    attemptCount: 1,
    rootCause: "otp_abandoned",
    confidence: 0.91,
    recommendedAction: "fresh_checkout_link",
    actionGated: false,
    actionResult: "processing",
    amountRecovered: 0,
    createdAt: Date.now(),
  };

  it("mints and dispatches a fresh checkout link action", async () => {
    const result = await executeRecoveryAction(sampleCase, "fresh_checkout_link");
    expect(result.success).toBe(true);
    expect(result.action).toBe("fresh_checkout_link");
    expect(result.channel).toContain("checkout_link");
    expect(result.dispatchId).toMatch(/^dsp_/);
    expect(result.recoveredAmount).toBe(8500);
  });

  it("schedules a delayed retry", async () => {
    const result = await executeRecoveryAction(sampleCase, "delayed_retry");
    expect(result.success).toBe(true);
    expect(result.action).toBe("delayed_retry");
    expect(result.message).toContain("delayed retry");
  });
});
