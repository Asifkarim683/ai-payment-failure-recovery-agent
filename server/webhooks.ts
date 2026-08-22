import { Router, Request, Response } from "express";
import {
  evaluatePolicy,
  normalizeFailureCode,
  recommendActionForFailure,
  resolveRecoveryStatus,
} from "./recovery.logic";
import {
  createApproval,
  getLatestRun,
  getPolicyRules,
  logAuditEvent,
  upsertCase,
} from "./db";
import { executeRecoveryAction } from "./execution";
import type {
  Approval,
  IngestedPaymentResult,
  RecoveryAuditEvent,
  RecoveryCase,
} from "@shared/types";

export const webhookRouter = Router();

export async function processPaymentFailureEvent(
  rawEvent: Record<string, any>,
  provider: "stripe" | "razorpay" | "custom" = "custom"
): Promise<IngestedPaymentResult> {
  const now = Date.now();
  const run = await getLatestRun();
  const policies = await getPolicyRules();
  const defaultPolicy = policies[0] ?? {
    amountCeiling: 10000,
    confidenceFloor: 0.82,
    maxRetries: 2,
    requiresApproval: false,
  };

  // 1. Extract metadata depending on provider
  let id = `evt_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  let merchantId = "m_default";
  let merchantName = "Apex Commerce";
  let amount = 5000;
  let declineCode = "insufficient_funds";
  let attemptCount = 0;

  if (provider === "stripe") {
    id = rawEvent.id ?? id;
    merchantId = rawEvent.data?.object?.customer ?? "m_stripe";
    merchantName = rawEvent.data?.object?.billing_details?.name ?? "Stripe Customer";
    amount = (rawEvent.data?.object?.amount ?? 500000) / 100; // in dollars/rupees
    declineCode =
      rawEvent.data?.object?.failure_code ??
      rawEvent.data?.object?.last_payment_error?.code ??
      rawEvent.data?.object?.failure_message ??
      "card_declined";
  } else if (provider === "razorpay") {
    id = rawEvent.payload?.payment?.entity?.id ?? id;
    merchantId = rawEvent.payload?.payment?.entity?.contact ?? "m_razorpay";
    merchantName = rawEvent.payload?.payment?.entity?.notes?.merchant_name ?? "Razorpay Merchant";
    amount = (rawEvent.payload?.payment?.entity?.amount ?? 500000) / 100;
    declineCode =
      rawEvent.payload?.payment?.entity?.error_code ??
      rawEvent.payload?.payment?.entity?.error_reason ??
      rawEvent.payload?.payment?.entity?.error_description ??
      "payment_failed";
  } else {
    // Custom / Synthetic payload
    id = rawEvent.id ?? id;
    merchantId = rawEvent.merchantId ?? merchantId;
    merchantName = rawEvent.merchantName ?? merchantName;
    amount = Number(rawEvent.amount) || amount;
    declineCode = rawEvent.declineCode ?? rawEvent.errorCode ?? declineCode;
    attemptCount = Number(rawEvent.attemptCount) || 0;
  }

  // 2. Diagnose root cause & confidence
  const { rootCause, confidence } = normalizeFailureCode(declineCode, provider);
  const recommendedAction = recommendActionForFailure(rootCause);

  const activePolicy =
    policies.find(p => p.rootCause === rootCause) ??
    policies[0] ?? {
      amountCeiling: 10000,
      confidenceFloor: 0.82,
      maxRetries: 2,
      requiresApproval: false,
    };

  // 3. Evaluate against policy rules
  const { gated, reasons } = evaluatePolicy(
    { amount, confidence, attemptCount },
    activePolicy
  );

  const initialStatus = resolveRecoveryStatus({
    gated,
    approval: gated ? "pending" : undefined,
  });

  const newCase: RecoveryCase = {
    id,
    runId: run.id,
    merchantId,
    merchantName,
    amount,
    paymentStatus: "failed",
    declineCode,
    attemptCount,
    rootCause,
    confidence,
    recommendedAction,
    actionGated: gated,
    gateReason: gated ? reasons.join("; ") || "Gated by policy" : undefined,
    actionResult: initialStatus,
    amountRecovered: 0,
    createdAt: now,
  };

  // 4. Save case to repository
  await upsertCase(newCase);

  // 5. Generate and log audit events
  const auditEvents: RecoveryAuditEvent[] = [
    {
      id: `aud_${id}_ingest`,
      eventId: id,
      stepName: "ingest",
      detail: `Payment failure received from ${provider.toUpperCase()} (Decline: ${declineCode})`,
      state: "done",
      timestamp: now,
    },
    {
      id: `aud_${id}_diagnose`,
      eventId: id,
      stepName: "diagnose",
      detail: `Classified as ${rootCause.replace("_", " ")} with ${Math.round(confidence * 100)}% confidence`,
      state: "done",
      timestamp: now + 500,
    },
    {
      id: `aud_${id}_policy`,
      eventId: id,
      stepName: "policy",
      detail: `Matched policy rule → ${recommendedAction.replace("_", " ")}`,
      state: "done",
      timestamp: now + 1000,
    },
    {
      id: `aud_${id}_gate`,
      eventId: id,
      stepName: "gate",
      detail: gated
        ? `Gated: ${reasons.join(", ")} (Amount: ₹${amount.toLocaleString("en-IN")})`
        : "Automated recovery execution approved under current policy ceiling",
      state: gated ? "warn" : "done",
      timestamp: now + 1500,
    },
  ];

  for (const evt of auditEvents) {
    await logAuditEvent(evt);
  }

  // 6. If gated, add to approval queue; if safe, execute automatically!
  let approval: Approval | undefined;
  if (gated) {
    approval = {
      id: `apr_${id}`,
      eventId: id,
      status: "pending",
    };
    await createApproval(approval);

    await logAuditEvent({
      id: `aud_${id}_exec_queue`,
      eventId: id,
      stepName: "execute",
      detail: "Action queued in Finance Ops approval queue",
      state: "current",
      timestamp: now + 2000,
    });
  } else {
    // Autonomous execution
    await executeRecoveryAction(newCase, recommendedAction);
  }

  return {
    success: true,
    case: newCase,
    auditEvents,
    approval,
  };
}

// Webhook HTTP Handler
webhookRouter.post("/payment", async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(400).json({ error: "Invalid webhook payload: Expected JSON object." });
      return;
    }
    const rawProvider = (req.headers["x-provider"] as string | undefined)?.toLowerCase();
    const provider: "stripe" | "razorpay" | "custom" =
      rawProvider === "stripe" || rawProvider === "razorpay" || rawProvider === "custom"
        ? rawProvider
        : "custom";

    const result = await processPaymentFailureEvent(req.body, provider);
    res.status(200).json({ status: "processed", result });
  } catch (error: any) {
    console.error("[Webhook Error]", error);
    res.status(500).json({ error: "Failed to process payment failure event" });
  }
});
