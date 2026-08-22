export function formatMoney(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatConfidence(confidence?: number): string {
  if (confidence === undefined || confidence === null) return "85%";
  return `${Math.round(confidence * 100)}%`;
}

export function formatCause(cause?: string): string {
  switch (cause) {
    case "otp_abandoned":
      return "OTP / 3DS abandoned";
    case "insufficient_funds":
      return "Insufficient funds";
    case "timeout":
      return "Bank / network timeout";
    case "expired_card":
      return "Card expired / invalid";
    case "do_not_honor":
      return "Issuer generic decline";
    case "cart_abandoned":
      return "Checkout abandonment";
    default:
      return cause ?? "Payment decline";
  }
}

export function formatAction(action?: string): string {
  switch (action) {
    case "fresh_checkout_link":
      return "Fresh checkout link";
    case "delayed_retry":
      return "Delayed retry";
    case "immediate_retry":
      return "Immediate retry";
    case "update_payment_method":
      return "Update payment method";
    case "cart_recovery_nudge":
      return "Cart recovery nudge";
    case "alternate_payment":
      return "Alternate payment prompt";
    default:
      return action ?? "Automated retry";
  }
}

export function getStatusStyle(status?: string): { className: string; label: string } {
  switch (status) {
    case "recovered":
    case "Recovered":
      return {
        className:
          "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs",
        label: "Recovered",
      };
    case "needs_approval":
    case "Needs approval":
      return {
        className:
          "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs",
        label: "Needs approval",
      };
    case "rejected":
    case "Rejected":
      return {
        className:
          "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs",
        label: "Rejected",
      };
    case "at_risk":
    case "At risk":
      return {
        className:
          "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs",
        label: "At risk",
      };
    case "processing":
    case "In progress":
    default:
      return {
        className:
          "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs",
        label: "In progress",
      };
  }
}

export function getInitials(name: string): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
