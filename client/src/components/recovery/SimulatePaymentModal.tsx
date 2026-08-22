import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, RefreshCw, Zap, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface SimulatePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SimulatePaymentModal({
  open,
  onOpenChange,
  onSuccess,
}: SimulatePaymentModalProps) {
  const [merchantName, setMerchantName] = useState("Vanguard Studio");
  const [amount, setAmount] = useState("14500");
  const [declineCode, setDeclineCode] = useState("otp_abandoned");

  const ingestMutation = trpc.recovery.ingestTestPayment.useMutation({
    onSuccess: (data) => {
      const isGated = data.case.actionGated;
      if (isGated) {
        toast.warning("Payment failure gated for review", {
          description: `Case ${data.case.id} (₹${data.case.amount.toLocaleString("en-IN")}) requires human approval.`,
        });
      } else {
        toast.success("Payment automatically recovered", {
          description: `Case ${data.case.id} processed under policy ceiling. Action dispatched.`,
        });
      }
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error("Failed to inject test payment", {
        description: err.message || "An unexpected error occurred.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount) || 5000;
    ingestMutation.mutate({
      merchantName,
      amount: numAmount,
      declineCode,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs tracking-wider uppercase">
            <PlusCircle size={16} /> Synthetic Ingestion
          </div>
          <DialogTitle className="text-xl">Simulate Payment Failure</DialogTitle>
          <DialogDescription>
            Inject a failed transaction event to observe the agent's real-time diagnosis,
            policy evaluation, and gating.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Customer / Merchant Name
            </label>
            <Input
              value={merchantName}
              onChange={e => setMerchantName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Amount at Risk (₹)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="14500"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Amounts &gt; ₹10,000 will be gated into the Approval Queue.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Decline Code / Reason
            </label>
            <select
              className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
              value={declineCode}
              onChange={e => setDeclineCode(e.target.value)}
            >
              <option value="otp_abandoned">OTP / 3DS Abandoned (otp_abandoned)</option>
              <option value="insufficient_funds">Insufficient Funds (insufficient_funds)</option>
              <option value="timeout">Bank / Network Timeout (timeout)</option>
              <option value="expired_card">Card Expired / Invalid (expired_card)</option>
              <option value="cart_abandoned">Cart Abandoned (cart_abandoned)</option>
              <option value="do_not_honor">Issuer Decline (do_not_honor)</option>
            </select>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2"
            disabled={ingestMutation.isPending}
          >
            {ingestMutation.isPending ? (
              <>
                <RefreshCw size={14} className="spin mr-2" /> Processing Ingestion…
              </>
            ) : (
              <>
                <Zap size={15} className="mr-2" /> Inject & Process Event
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
