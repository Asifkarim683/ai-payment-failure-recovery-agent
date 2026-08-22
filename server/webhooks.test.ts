import { describe, expect, it } from "vitest";
import { processPaymentFailureEvent } from "./webhooks";

describe("processPaymentFailureEvent", () => {
  it("processes a Stripe failed payment event and auto-recovers within ceiling", async () => {
    const stripePayload = {
      id: "ch_test_stripe_123",
      data: {
        object: {
          customer: "cus_123",
          billing_details: { name: "Stripe Buyer" },
          amount: 450000, // ₹4,500
          failure_code: "insufficient_funds",
        },
      },
    };

    const result = await processPaymentFailureEvent(stripePayload, "stripe");
    expect(result.success).toBe(true);
    expect(result.case.amount).toBe(4500);
    expect(result.case.rootCause).toBe("insufficient_funds");
    expect(result.case.actionGated).toBe(false);
    expect(result.case.actionResult).toBe("recovered");
  });

  it("gates a high-value Razorpay event requiring human approval", async () => {
    const razorpayPayload = {
      payload: {
        payment: {
          entity: {
            id: "pay_rzp_999",
            contact: "9876543210",
            amount: 1500000, // ₹15,000 > ₹10,000 ceiling
            error_code: "BAD_REQUEST_PAYMENT_DECLINED_BY_BANK",
            notes: { merchant_name: "Apex Store" },
          },
        },
      },
    };

    const result = await processPaymentFailureEvent(razorpayPayload, "razorpay");
    expect(result.success).toBe(true);
    expect(result.case.amount).toBe(15000);
    expect(result.case.actionGated).toBe(true);
    expect(result.case.actionResult).toBe("needs_approval");
    expect(result.approval).toBeDefined();
    expect(result.approval?.status).toBe("pending");
  });
});
