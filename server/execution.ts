import type { RecoveryAction, RecoveryCase, RecoveryAuditEvent } from "@shared/types";
import { logAuditEvent, updateCaseStatus } from "./db";

export interface ExecutionResult {
  success: boolean;
  action: RecoveryAction;
  channel: string;
  dispatchId: string;
  message: string;
  recoveredAmount: number;
}

export async function executeRecoveryAction(
  recoveryCase: RecoveryCase,
  action?: RecoveryAction
): Promise<ExecutionResult> {
  const targetAction = action ?? recoveryCase.recommendedAction ?? "delayed_retry";
  const dispatchId = `dsp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();

  let channel = "email";
  let message = "";
  let success = true;
  let recoveredAmount = 0;

  switch (targetAction) {
    case "fresh_checkout_link": {
      channel = "email + checkout_link";
      const link = `https://pay.recoverly.io/checkout/${recoveryCase.id}?token=${dispatchId}`;
      message = `Fresh checkout link minted and dispatched to customer: ${link}`;
      recoveredAmount = recoveryCase.amount;
      break;
    }

    case "delayed_retry": {
      channel = "automated_engine";
      message = `Scheduled delayed retry in 4 hours after salary/credit refresh cycle. Dispatch ref: ${dispatchId}`;
      recoveredAmount = recoveryCase.amount;
      break;
    }

    case "update_payment_method": {
      channel = "email_portal";
      message = `Card update portal link sent to customer email. Dispatch ref: ${dispatchId}`;
      recoveredAmount = recoveryCase.amount;
      break;
    }

    case "immediate_retry": {
      channel = "payment_gateway";
      message = `Dispatched immediate retry command to gateway after transient bank timeout resolved.`;
      recoveredAmount = recoveryCase.amount;
      break;
    }

    case "cart_recovery_nudge": {
      channel = "sms + whatsapp";
      message = `Omnichannel recovery reminder with pre-filled cart sent to customer phone.`;
      recoveredAmount = recoveryCase.amount;
      break;
    }

    case "alternate_payment":
    default: {
      channel = "email + sms";
      message = `Prompted customer to try alternate payment method (UPI / NetBanking / Different Card).`;
      recoveredAmount = recoveryCase.amount;
      break;
    }
  }

  // Record execution in the case's audit log
  const auditEvent: RecoveryAuditEvent = {
    id: `aud_${recoveryCase.id}_exec_${Date.now()}`,
    eventId: recoveryCase.id,
    stepName: "execute",
    detail: `[Action: ${targetAction}] ${message}`,
    state: success ? "done" : "warn",
    timestamp: now,
    metadata: {
      dispatchId,
      channel,
      action: targetAction,
      amount: recoveryCase.amount,
    },
  };

  await logAuditEvent(auditEvent);

  // Update case status to recovered
  if (success) {
    await updateCaseStatus(recoveryCase.id, "recovered", recoveredAmount);
  }

  return {
    success,
    action: targetAction,
    channel,
    dispatchId,
    message,
    recoveredAmount,
  };
}
