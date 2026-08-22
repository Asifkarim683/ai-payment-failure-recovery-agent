import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock3,
  Sparkles,
  ChevronRight,
  X,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Bot,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import type { RecoveryCase } from "@shared/types";
import {
  formatAction,
  formatCause,
  formatConfidence,
  formatMoney,
  getInitials,
  getStatusStyle,
} from "./recoveryUtils";
import { AINudgeModal } from "./AINudgeModal";

interface DecisionTraceDrawerProps {
  selectedCase: RecoveryCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving?: boolean;
}

export function DecisionTraceDrawer({
  selectedCase,
  open,
  onOpenChange,
  onApprove,
  onReject,
  isApproving = false,
}: DecisionTraceDrawerProps) {
  const [nudgeOpen, setNudgeOpen] = useState(false);

  const auditQuery = trpc.recovery.getCaseAuditTrail.useQuery(
    { eventId: selectedCase?.id ?? "" },
    { enabled: !!selectedCase && open }
  );

  if (!selectedCase) return null;

  const statusInfo = getStatusStyle(selectedCase.actionResult);
  const confidenceNum = Math.round((selectedCase.confidence ?? 0.85) * 100);

  return (
    <>
      <Sheet open={open && !!selectedCase} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto p-0 bg-slate-50/80 backdrop-blur-md border-l border-slate-200">
          {/* Header Banner */}
          <div className="bg-white border-b border-slate-200/80 p-6 pb-5 sticky top-0 z-10">
            <div className="flex items-center justify-between pr-8 mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                  Decision Trace
                </span>
              </div>
              <Badge
                variant="secondary"
                className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
              >
                <Sparkles size={10} className="text-blue-500" /> Gemini 3.5 Active
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                {getInitials(selectedCase.merchantName)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {selectedCase.merchantName}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700">
                    {selectedCase.id}
                  </span>
                  <span>·</span>
                  <span>{new Date(selectedCase.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Amount & Status Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Amount at Risk
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {formatMoney(selectedCase.amount)}
                </div>
              </div>
              <span className={statusInfo.className}>{statusInfo.label}</span>
            </div>

            {/* AI Nudge Action Trigger */}
            <Button
              onClick={() => setNudgeOpen(true)}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-md rounded-xl h-10 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles size={15} />
              Draft AI Recovery Nudge (Email / WhatsApp)
            </Button>

            {/* AI Diagnosis Reasoner Card */}
            <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <Bot size={14} className="text-blue-600" />
                  <span>AI Root Cause Diagnosis</span>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                  {formatCause(selectedCase.rootCause)}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                Telemetry matches a{" "}
                <span className="font-semibold text-slate-800">
                  {formatCause(selectedCase.rootCause).toLowerCase()}
                </span>{" "}
                failure pattern. Recommended action is bounded by active workspace governance rules.
              </p>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Confidence Score</span>
                  <span className="font-bold text-blue-600">{formatConfidence(selectedCase.confidence)}</span>
                </div>
                <Progress value={confidenceNum} className="h-2 bg-slate-100" />
              </div>
            </div>

            {/* Pipeline Audit Stepper */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock3 size={14} className="text-slate-500" />
                  <span>Pipeline Audit Trail</span>
                </div>
                {auditQuery.isLoading && (
                  <RefreshCw size={12} className="animate-spin text-slate-400" />
                )}
              </div>

              <div className="relative pl-6 space-y-4 pt-1">
                {/* Timeline vertical bar */}
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200" />

                {(auditQuery.data ?? []).map((step, idx) => {
                  const isWarn = step.state === "warn";
                  const isCurrent = step.state === "current";

                  return (
                    <div key={step.id || idx} className="relative group">
                      {/* Step Dot */}
                      <div
                        className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                          isWarn
                            ? "bg-amber-50 border-amber-500 text-amber-600"
                            : isCurrent
                            ? "bg-blue-50 border-blue-600 text-blue-600"
                            : "bg-emerald-500 border-emerald-500 text-white"
                        }`}
                      >
                        {isWarn ? (
                          <AlertTriangle size={10} />
                        ) : isCurrent ? (
                          <Clock3 size={10} />
                        ) : (
                          <Check size={10} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 capitalize">
                            {step.stepName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matched Policy Rule Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-indigo-600" />
                <span>Matched Policy Rule</span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800">
                    {formatAction(selectedCase.recommendedAction)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Decline Code:{" "}
                    <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono text-slate-700">
                      {selectedCase.declineCode || selectedCase.rootCause}
                    </code>
                  </div>
                  {selectedCase.gateReason && (
                    <p className="text-amber-600 font-semibold text-xs mt-1.5">
                      ⚠️ {selectedCase.gateReason}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons if Pending Approval */}
            {selectedCase.actionResult === "needs_approval" && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onApprove(selectedCase.id)}
                  disabled={isApproving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  <Check size={16} className="mr-1" />
                  {isApproving ? "Approving..." : "Approve Action"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onReject(selectedCase.id)}
                  disabled={isApproving}
                  className="w-24 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold h-10 rounded-xl text-xs cursor-pointer"
                >
                  <X size={16} className="mr-1" /> Reject
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* AI Generative Nudge Modal */}
      <AINudgeModal
        open={nudgeOpen}
        onOpenChange={setNudgeOpen}
        caseData={selectedCase}
      />
    </>
  );
}
