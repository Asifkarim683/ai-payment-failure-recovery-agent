import { useState } from "react";
import {
  Sparkles,
  Mail,
  MessageSquare,
  Smartphone,
  Copy,
  Check,
  Send,
  RefreshCw,
  Gift,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { RecoveryCase } from "@shared/types";

interface AINudgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: RecoveryCase | null;
}

export function AINudgeModal({ open, onOpenChange, caseData }: AINudgeModalProps) {
  const [channel, setChannel] = useState<"email" | "whatsapp" | "sms">("email");
  const [tone, setTone] = useState<"concierge" | "urgent" | "security_first" | "friendly">("concierge");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const generateMutation = trpc.ai.generateNudge.useMutation({
    onSuccess: () => {
      toast.success("AI Outreach Drafted", {
        description: "Gemini generated context-optimized copy for this transaction.",
      });
    },
    onError: (err) => {
      toast.error("Generation failed", {
        description: err.message || "Please check your Gemini API configuration.",
      });
    },
  });

  const handleGenerate = () => {
    if (!caseData) return;
    generateMutation.mutate({
      caseId: caseData.id,
      channel,
      tone,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
    });
  };

  const handleCopy = () => {
    if (!generateMutation.data) return;
    const { subject, headline, body, ctaText } = generateMutation.data;
    const text = `Subject: ${subject}\n\n${headline}\n\n${body}\n\n[Button: ${ctaText}]`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatch = () => {
    toast.success("Outreach Dispatched!", {
      description: `Simulated dispatch of ${channel.toUpperCase()} to customer for case ${caseData?.id}.`,
    });
    onOpenChange(false);
  };

  if (!caseData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-white p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center">
              <Sparkles size={15} />
            </div>
            <DialogTitle className="text-lg font-bold">
              AI Generative Outreach Nudge
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-xs">
            Draft tone-adaptive customer communication powered by Google Gemini for case{" "}
            <code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded">{caseData.id}</code> (₹{caseData.amount.toLocaleString("en-IN")}).
          </DialogDescription>
        </DialogHeader>

        {/* Configuration Controls */}
        <div className="grid grid-cols-3 gap-3 my-2 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Channel</label>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Tone</label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white"
            >
              <option value="concierge">Concierge (VIP)</option>
              <option value="urgent">Urgent / Time-bound</option>
              <option value="security_first">Security Reassuring</option>
              <option value="friendly">Friendly Casual</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Incentive</label>
            <select
              value={discountPercent}
              onChange={e => setDiscountPercent(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white"
            >
              <option value={0}>No Discount</option>
              <option value={5}>5% Recovery Coupon</option>
              <option value={10}>10% Urgency Coupon</option>
            </select>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2"
        >
          {generateMutation.isPending ? (
            <>
              <RefreshCw size={13} className="spin mr-2" /> Generating with Gemini…
            </>
          ) : (
            <>
              <Sparkles size={13} className="mr-2" /> Generate AI Copy
            </>
          )}
        </Button>

        {/* AI Generated Preview Card */}
        {generateMutation.data ? (
          <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                {generateMutation.data.channel.toUpperCase()} PREVIEW ({generateMutation.data.tone})
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Subject: </span>
              <strong className="text-slate-200">{generateMutation.data.subject}</strong>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Banner: </span>
              <span className="text-blue-300 font-semibold">{generateMutation.data.headline}</span>
            </div>

            <p className="text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              {generateMutation.data.body}
            </p>

            <div className="pt-1 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">
                CTA: <strong className="text-emerald-400">{generateMutation.data.ctaText}</strong>
              </span>
              <Button
                size="sm"
                onClick={handleDispatch}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3"
              >
                <Send size={12} className="mr-1.5" /> Dispatch Outreach
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            Click <strong>"Generate AI Copy"</strong> to preview real-time LLM messaging tailored to this transaction.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
