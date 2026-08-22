import { describe, expect, it } from "vitest";
import {
  generateAIDiagnosis,
  generateRecoveryNudge,
  chatWithFinanceCopilot,
  generatePolicyAdvice,
} from "./ai.service";
import type { PolicyRule, RecoveryCase } from "@shared/types";

describe("AI Service (Google Gemini)", () => {
  const mockCase: RecoveryCase = {
    id: "evt_test_ai_01",
    runId: "run_test",
    merchantId: "m_acme",
    merchantName: "Acme Commerce",
    amount: 14500,
    paymentStatus: "failed",
    declineCode: "otp_abandoned",
    attemptCount: 1,
    rootCause: "otp_abandoned",
    confidence: 0.92,
    recommendedAction: "fresh_checkout_link",
    actionGated: true,
    actionResult: "needs_approval",
    amountRecovered: 0,
    createdAt: Date.now(),
  };

  const mockPolicy: PolicyRule = {
    id: "pol_test",
    rootCause: "otp_abandoned",
    amountCeiling: 10000,
    confidenceFloor: 0.82,
    maxRetries: 2,
    cooldownMinutes: 240,
    channels: ["email", "sms", "link"],
    requiresApproval: false,
  };

  it("generates AI multi-signal diagnosis with confidence and root cause", async () => {
    const result = await generateAIDiagnosis(mockCase);

    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.explanation).toBeDefined();
    expect(typeof result.explanation).toBe("string");
    expect(result.recommendedAction).toBeDefined();
  });

  it("generates personalized omnichannel recovery nudges", async () => {
    const nudge = await generateRecoveryNudge({
      caseData: mockCase,
      channel: "email",
      tone: "concierge",
      discountPercent: 5,
    });

    expect(nudge).toBeDefined();
    expect(nudge.subject).toBeDefined();
    expect(nudge.body).toBeDefined();
    expect(nudge.ctaText).toBeDefined();
    expect(nudge.channel).toBe("email");
  });

  it("interacts with AI Finance Copilot", async () => {
    const copilotReply = await chatWithFinanceCopilot({
      message: "Why was case evt_test_ai_01 gated?",
      cases: [mockCase],
      policies: [mockPolicy],
      totalRecovered: 50850,
    });

    expect(copilotReply).toBeDefined();
    expect(copilotReply.reply).toBeDefined();
    expect(typeof copilotReply.reply).toBe("string");
  });

  it("generates autonomous policy health & optimization recommendations", async () => {
    const advice = await generatePolicyAdvice([mockCase], mockPolicy);

    expect(advice).toBeDefined();
    expect(advice.currentHealthScore).toBeGreaterThan(0);
    expect(Array.isArray(advice.recommendations)).toBe(true);
  });
});
